import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { MetaLeadService } from '@/services/meta-lead.service';

/**
 * GET: Meta Webhook Challenge & Verification Handshake.
 * Strictly verifies `hub.mode === 'subscribe'` and validates `hub.verify_token`.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get('hub.mode');
    const challenge = url.searchParams.get('hub.challenge');
    const verifyToken = url.searchParams.get('hub.verify_token');
    const key = url.searchParams.get('key');
    const tenantId = url.searchParams.get('tenantId');

    // 1. Validate Meta handshake parameters
    if (mode !== 'subscribe') {
      return new Response('Forbidden: Invalid hub.mode', { status: 403 });
    }

    if (!challenge) {
      return new Response('Bad Request: Missing hub.challenge', { status: 400 });
    }

    // 2. Resolve target Tenant Integration
    let integration = null;
    if (key) {
      integration = await prisma.tenantIntegration.findUnique({
        where: { apiKey: key },
      });
    } else if (tenantId) {
      integration = await prisma.tenantIntegration.findFirst({
        where: { tenantId, provider: 'FACEBOOK' },
      });
    }

    // 3. Verify Token Matching
    // Check against tenant's configured verifyToken, API key fallback, or global environment variable
    const metadata = (integration?.metadata as Record<string, any>) || {};
    const configuredToken =
      metadata.verifyToken ||
      integration?.apiKey ||
      process.env.META_VERIFY_TOKEN;

    if (!configuredToken || verifyToken !== configuredToken) {
      console.warn('[META_WEBHOOK_VERIFY_FAILED]', {
        provided: verifyToken,
        expected: configuredToken ? '***CONFIGURED***' : 'NONE',
      });
      return new Response('Forbidden: Invalid hub.verify_token', { status: 403 });
    }

    // 4. Return plain text challenge as required by Meta Developer specifications
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error: any) {
    console.error('[META_WEBHOOK_GET_ERROR]', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * POST: Unified Meta Lead Ads Inbound Webhook.
 * Cryptographically validates X-Hub-Signature-256, fetches Graph API field data,
 * and ingests high-priority inquiries directly into the CRM.
 */
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    const tenantIdParam = url.searchParams.get('tenantId');

    // 1. Read Raw Body for HMAC-SHA256 validation
    const rawBody = await request.text();
    const signatureHeader =
      request.headers.get('x-hub-signature-256') ||
      request.headers.get('X-Hub-Signature-256');

    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Bad Request: Invalid JSON body' }, { status: 400 });
    }

    // 2. Resolve Tenant Integration
    let integration = null;

    if (key) {
      integration = await prisma.tenantIntegration.findUnique({
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
    } else if (tenantIdParam) {
      integration = await prisma.tenantIntegration.findFirst({
        where: { tenantId: tenantIdParam, provider: 'FACEBOOK' },
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
    } else {
      // Resolve by incoming page_id from payload
      const pageId =
        body.entry?.[0]?.id ||
        body.entry?.[0]?.changes?.[0]?.value?.page_id;

      if (pageId) {
        integration = await prisma.tenantIntegration.findFirst({
          where: {
            provider: 'FACEBOOK',
            isActive: true,
            metadata: {
              path: ['pageId'],
              equals: pageId,
            },
          },
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
      }
    }

    if (!integration || !integration.isActive) {
      return NextResponse.json(
        { error: 'Unauthorized: No active Meta integration found' },
        { status: 401 }
      );
    }

    const tenantId = integration.tenantId;
    const branchId = integration.tenant.branches[0]?.id || null;
    const metadata = (integration.metadata as Record<string, any>) || {};

    // 3. Cryptographic Signature Validation
    const appSecret = metadata.appSecret || process.env.META_APP_SECRET;

    if (appSecret) {
      const isSignatureValid = MetaLeadService.verifySignature(
        rawBody,
        signatureHeader,
        appSecret
      );

      if (!isSignatureValid) {
        console.error('[META_WEBHOOK_INVALID_SIGNATURE]', {
          receivedSignature: signatureHeader,
          tenantId,
        });
        return NextResponse.json(
          { error: 'Unauthorized: Invalid X-Hub-Signature-256' },
          { status: 401 }
        );
      }
    } else {
      console.warn(
        `[META_WEBHOOK_WARNING] Tenant ${tenantId} does not have an App Secret configured. Processing via API key.`
      );
    }

    // 4. Retrieve Meta Page Access Token
    const pageAccessToken =
      metadata.pageAccessToken || process.env.META_PAGE_ACCESS_TOKEN;

    if (!pageAccessToken) {
      console.error(`[META_WEBHOOK_CONFIG_ERROR] Missing Page Access Token for tenant ${tenantId}`);
      return NextResponse.json(
        { error: 'Configuration Error: Page Access Token missing for Meta Graph API calls' },
        { status: 500 }
      );
    }

    // 5. Process Inbound Leadgen Events
    const entries = Array.isArray(body.entry) ? body.entry : [];
    const processedInquiries: string[] = [];

    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes) {
        if (change.field === 'leadgen' && change.value?.leadgen_id) {
          const leadgenId = change.value.leadgen_id;

          try {
            // A. Fetch full user submission from Meta Graph API
            const leadData = await MetaLeadService.fetchLeadFromGraphApi(
              leadgenId,
              pageAccessToken
            );

            // B. Map & Ingest into Prisma CRM tables
            const inquiry = await MetaLeadService.ingestMetaLead({
              tenantId,
              branchId,
              leadData,
              rawPayload: change.value,
            });

            processedInquiries.push(inquiry.id);
          } catch (leadError: any) {
            console.error(`[META_LEAD_INGESTION_ERROR] Leadgen ${leadgenId}:`, leadError);
          }
        }
      }
    }

    // 6. Revalidate CRM Pipeline Views
    revalidatePath('/inquiries');
    revalidatePath('/(dashboard)/inquiries');

    return NextResponse.json(
      {
        success: true,
        message: `Successfully processed ${processedInquiries.length} Meta ad lead(s)`,
        inquiryIds: processedInquiries,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[META_WEBHOOK_POST_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error processing Meta webhook' },
      { status: 500 }
    );
  }
}
