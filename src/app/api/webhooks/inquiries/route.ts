import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { InquiryService } from '@/services/inquiry.service';
import { formatWhatsAppPhone } from '@/utils/whatsapp.utils';

/**
 * Normalizes varied webhook payloads from Zapier, Pabbly Connect, Google Ads, or Custom Webhooks.
 * (Note: Meta Lead Ads uses the dedicated /api/webhooks/meta endpoint).
 */
function extractInquiryData(body: any) {
  if (!body || typeof body !== 'object') {
    return {
      name: '',
      phone: '',
      whatsapp: '',
      email: '',
      eventDate: null,
      eventType: '',
      preferredContactTime: null,
      budgetRange: null,
      notes: '',
    };
  }

  // Look into common nested wrapper keys (e.g. data, payload, form_data)
  const source = body.data || body.payload || body.form_data || body;

  // Name resolution
  const name =
    source.name ||
    source.clientName ||
    source.customerName ||
    source.fullName ||
    source.full_name ||
    source.contact_name ||
    source.lead_name ||
    [source.firstName || source.first_name, source.lastName || source.last_name].filter(Boolean).join(' ').trim() ||
    'Online Lead';

  // Phone resolution
  const rawPhone =
    source.phone ||
    source.clientPhone ||
    source.customerPhone ||
    source.phoneNumber ||
    source.phone_number ||
    source.mobile ||
    source.contact ||
    source.whatsapp ||
    '';

  const phone = formatWhatsAppPhone(rawPhone) || rawPhone;
  const whatsapp = source.whatsapp ? formatWhatsAppPhone(source.whatsapp) || phone : phone;

  // Email resolution
  const email =
    source.email ||
    source.clientEmail ||
    source.customerEmail ||
    source.emailAddress ||
    source.email_address ||
    null;

  // Event Date resolution
  let eventDate: Date | null = null;
  const rawDate = source.eventDate || source.event_date || source.shootDate || source.date || source.booking_date;
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      eventDate = parsed;
    }
  }

  // Event Type resolution
  const eventType =
    source.eventType ||
    source.event_type ||
    source.service ||
    source.category ||
    source.package ||
    source.shoot_type ||
    null;

  // Preferred Contact Time
  const preferredContactTime =
    source.preferredContactTime ||
    source.preferred_contact_time ||
    source.callTime ||
    source.call_time ||
    source.time ||
    null;

  // Budget Range
  const budgetRange =
    source.budgetRange ||
    source.budget_range ||
    source.budget ||
    source.packageBudget ||
    null;

  // Notes / Message resolution
  const notes =
    source.notes ||
    source.message ||
    source.comments ||
    source.details ||
    source.description ||
    source.vision ||
    null;

  return {
    name,
    phone,
    whatsapp,
    email,
    eventDate,
    eventType,
    preferredContactTime,
    budgetRange,
    notes,
    rawPayload: body,
  };
}

/**
 * GET: Webhook verification / health check endpoint for third-party platforms (Zapier, Pabbly, Custom).
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    // If Meta challenge is mistakenly sent to this endpoint, instruct developer
    if (url.searchParams.get('hub.challenge')) {
      return NextResponse.json(
        { error: 'Meta Lead Ads webhooks must be routed to /api/webhooks/meta' },
        { status: 400 }
      );
    }

    const key =
      url.searchParams.get('key') ||
      request.headers.get('x-api-key') ||
      (request.headers.get('authorization')?.startsWith('Bearer ')
        ? request.headers.get('authorization')?.split(' ')[1]
        : null);

    if (!key) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing API key (?key=... query parameter required)' },
        { status: 401 }
      );
    }

    const integration = await prisma.tenantIntegration.findUnique({
      where: { apiKey: key },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!integration || !integration.isActive) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or deactivated integration API key' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      status: 'active',
      provider: integration.provider,
      name: integration.name,
      studio: integration.tenant.name,
      verifiedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 500 });
  }
}

/**
 * POST: Omnichannel Inbound Lead Ingestion for Zapier, Pabbly, Google Ads, and Custom Webhooks.
 */
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const key =
      url.searchParams.get('key') ||
      request.headers.get('x-api-key') ||
      (request.headers.get('authorization')?.startsWith('Bearer ')
        ? request.headers.get('authorization')?.split(' ')[1]
        : null);

    // 1. Authenticate Request via TenantIntegration table
    if (!key) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing API key. Pass via ?key= query parameter or x-api-key header' },
        { status: 401 }
      );
    }

    const integration = await prisma.tenantIntegration.findUnique({
      where: { apiKey: key },
      include: {
        tenant: {
          include: {
            branches: {
              where: { deletedAt: null },
              orderBy: [{ isHeadOffice: 'desc' }, { createdAt: 'asc' }],
              take: 1,
            },
          },
        },
      },
    });

    if (!integration || !integration.isActive) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or deactivated integration API key' },
        { status: 401 }
      );
    }

    const tenantId = integration.tenantId;
    const branchId = integration.tenant.branches[0]?.id || null;

    // 2. Parse Incoming Payload
    let body: any = {};
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      const formEntries: Record<string, any> = {};
      formData.forEach((val, k) => {
        formEntries[k] = val;
      });
      body = formEntries;
    } else {
      try {
        body = await request.json();
      } catch {
        body = {};
      }
    }

    // Direct Meta payloads sent here should be redirected
    if (body?.entry?.[0]?.changes?.[0]?.field === 'leadgen') {
      return NextResponse.json(
        { error: 'Meta Lead Ads webhooks must be routed to /api/webhooks/meta for Graph API processing.' },
        { status: 400 }
      );
    }

    const extracted = extractInquiryData(body);

    if (!extracted.name && !extracted.phone && !extracted.email) {
      return NextResponse.json(
        { error: 'Bad Request: Payload must contain at least a name, phone, or email' },
        { status: 400 }
      );
    }

    // 3. Resolve or Create LeadSource for this Tenant
    const sourceParam = url.searchParams.get('source') || integration.provider;
    const sourceCode = sourceParam.toUpperCase().trim();
    const sourceName = `${sourceCode.charAt(0) + sourceCode.slice(1).toLowerCase()} Lead Integration`;

    let leadSource = await prisma.leadSource.findFirst({
      where: { tenantId, code: sourceCode },
    });

    if (!leadSource) {
      leadSource = await prisma.leadSource.create({
        data: {
          tenantId,
          code: sourceCode,
          name: sourceName,
          isActive: true,
        },
      });
    }

    // 4. Persist Inquiry using InquiryService with full schema fields
    const combinedNotes = [
      extracted.notes,
      `[Captured via ${integration.provider} Webhook API key: ${integration.name || integration.provider}]`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const inquiry = await InquiryService.create(tenantId, branchId, {
      customerName: extracted.name,
      customerPhone: extracted.phone,
      customerWhatsapp: extracted.whatsapp,
      customerEmail: extracted.email,
      inquiryDate: new Date(),
      eventDate: extracted.eventDate,
      eventType: extracted.eventType,
      preferredContactTime: extracted.preferredContactTime,
      budgetRange: extracted.budgetRange,
      leadSourceId: leadSource.id,
      notes: combinedNotes,
      priority: 'MEDIUM',
      createdById: null,
    });

    // 5. Revalidate Inquiries Dashboard
    revalidatePath('/inquiries');
    revalidatePath('/(dashboard)/inquiries');

    return NextResponse.json(
      {
        success: true,
        message: 'Lead inquiry received and mapped successfully',
        inquiryId: inquiry.id,
        inquiryCode: inquiry.inquiryCode,
        provider: integration.provider,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[WEBHOOK_INQUIRIES_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error processing webhook lead' },
      { status: 500 }
    );
  }
}
