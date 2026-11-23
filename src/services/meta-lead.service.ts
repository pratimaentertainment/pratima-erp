import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { InquiryService } from '@/services/inquiry.service';
import { formatWhatsAppPhone } from '@/utils/whatsapp.utils';
import { STANDARD_EVENT_TYPES } from '@/features/inquiries/schemas/inquiry.schema';

export interface MetaFieldDataItem {
  name: string;
  values: string[];
}

export interface MetaGraphLeadData {
  id: string;
  created_time: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  page_id?: string;
  field_data: MetaFieldDataItem[];
}

export interface ParsedMetaInquiry {
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp: string;
  email: string | null;
  eventDate: Date | null;
  eventType: string | null;
  preferredContactTime: string | null;
  budgetRange: string | null;
  unmappedQuestions: Array<{ question: string; answer: string }>;
  campaignName?: string;
  adName?: string;
  formId?: string;
}

export class MetaLeadService {
  /**
   * Cryptographically validates Meta's X-Hub-Signature-256 header.
   * Protects against spoofing by verifying HMAC-SHA256(rawBody, appSecret).
   */
  static verifySignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
    if (!signatureHeader || !appSecret) {
      return false;
    }

    try {
      // Signature header format: "sha256=<hex_digest>"
      const [algorithm, signature] = signatureHeader.split('=');
      if (algorithm !== 'sha256' || !signature) {
        return false;
      }

      const expectedHmac = crypto
        .createHmac('sha256', appSecret)
        .update(rawBody, 'utf8')
        .digest('hex');

      const signatureBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedHmac, 'hex');

      if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch (err) {
      console.error('[META_SIGNATURE_VERIFICATION_ERROR]', err);
      return false;
    }
  }

  /**
   * Fetches full lead payload from Meta Graph API using leadgen_id and Page Access Token.
   */
  static async fetchLeadFromGraphApi(
    leadgenId: string,
    pageAccessToken: string
  ): Promise<MetaGraphLeadData> {
    if (!leadgenId) {
      throw new Error('Missing leadgen_id for Graph API retrieval');
    }
    if (!pageAccessToken) {
      throw new Error('Missing Meta Page Access Token. Please configure it in Settings > Integrations.');
    }

    const fields = [
      'id',
      'created_time',
      'ad_id',
      'ad_name',
      'adset_id',
      'adset_name',
      'campaign_id',
      'campaign_name',
      'form_id',
      'page_id',
      'field_data',
    ].join(',');

    const url = `https://graph.facebook.com/v21.0/${leadgenId}?fields=${fields}&access_token=${encodeURIComponent(
      pageAccessToken
    )}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData?.error?.message ||
        `Graph API request failed with HTTP ${response.status} (${response.statusText})`;
      console.error('[META_GRAPH_API_ERROR]', errorData);
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Intelligently parses Meta's field_data array into normalized Inquiry CRM fields.
   */
  static parseMetaFieldData(leadData: MetaGraphLeadData): ParsedMetaInquiry {
    const fieldMap = new Map<string, string>();
    const unmapped: Array<{ question: string; answer: string }> = [];

    (leadData.field_data || []).forEach((item) => {
      const key = (item.name || '').trim().toLowerCase();
      const val = (item.values?.[0] || '').trim();
      if (key && val) {
        fieldMap.set(key, val);
      }
    });

    // 1. Resolve Name (First Name + Last Name)
    let firstName = '';
    let lastName = '';

    // Check specific first/last fields
    const directFirst = fieldMap.get('first_name') || fieldMap.get('firstname');
    const directLast = fieldMap.get('last_name') || fieldMap.get('lastname');

    if (directFirst) {
      firstName = directFirst;
      lastName = directLast || '';
    } else {
      // Find full_name or any name key
      let rawFullName = '';
      for (const [key, val] of fieldMap.entries()) {
        if (key.includes('name') && !key.includes('event') && !key.includes('campaign') && !key.includes('ad')) {
          rawFullName = val;
          break;
        }
      }

      if (rawFullName) {
        const parts = rawFullName.split(/\s+/);
        firstName = parts[0] || 'Client';
        lastName = parts.slice(1).join(' ') || '';
      } else {
        firstName = 'Meta';
        lastName = 'Lead';
      }
    }

    // 2. Resolve Phone Number & WhatsApp
    let rawPhone = '';
    for (const [key, val] of fieldMap.entries()) {
      if (key.includes('phone') || key.includes('mobile') || key.includes('contact') || key.includes('whatsapp')) {
        rawPhone = val;
        break;
      }
    }

    const cleanPhone = formatWhatsAppPhone(rawPhone) || rawPhone;

    // 3. Resolve Email
    let email: string | null = null;
    for (const [key, val] of fieldMap.entries()) {
      if (key.includes('email')) {
        email = val.toLowerCase();
        break;
      }
    }

    // 4. Resolve Event Date (Fuzzy Match)
    let eventDate: Date | null = null;
    for (const [key, val] of fieldMap.entries()) {
      if (
        key.includes('event_date') ||
        key.includes('wedding_date') ||
        key.includes('shoot_date') ||
        key.includes('function_date') ||
        key.includes('date_of_event') ||
        (key.includes('date') && !key.includes('created') && !key.includes('birth'))
      ) {
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime())) {
          eventDate = parsed;
          break;
        }
      }
    }

    // 5. Resolve Event Type (Fuzzy Match & Standard Alignment)
    let eventType: string | null = null;
    for (const [key, val] of fieldMap.entries()) {
      if (
        key.includes('event_type') ||
        key.includes('shoot_type') ||
        key.includes('type_of_event') ||
        key.includes('service') ||
        key.includes('category') ||
        key.includes('looking_for')
      ) {
        // Find best match in STANDARD_EVENT_TYPES
        const matchedStandard = STANDARD_EVENT_TYPES.find((t) =>
          val.toLowerCase().includes(t.toLowerCase())
        );
        eventType = matchedStandard || val;
        break;
      }
    }

    // 6. Resolve Preferred Contact Time (Fuzzy Match)
    let preferredContactTime: string | null = null;
    for (const [key, val] of fieldMap.entries()) {
      if (
        key.includes('time') ||
        key.includes('call') ||
        key.includes('contact_time') ||
        key.includes('convenient')
      ) {
        preferredContactTime = val;
        break;
      }
    }

    // 7. Resolve Budget Range (Fuzzy Match)
    let budgetRange: string | null = null;
    for (const [key, val] of fieldMap.entries()) {
      if (
        key.includes('budget') ||
        key.includes('package') ||
        key.includes('spend') ||
        key.includes('investment') ||
        key.includes('price')
      ) {
        budgetRange = val;
        break;
      }
    }

    // 8. Capture Any Unmapped Custom Questions
    const recognizedKeys = new Set([
      'first_name',
      'firstname',
      'last_name',
      'lastname',
      'full_name',
      'phone_number',
      'mobile',
      'contact',
      'whatsapp',
      'email',
      'email_address',
    ]);

    fieldMap.forEach((val, key) => {
      if (!recognizedKeys.has(key)) {
        unmapped.push({
          question: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          answer: val,
        });
      }
    });

    return {
      firstName,
      lastName,
      phone: cleanPhone,
      whatsapp: cleanPhone,
      email,
      eventDate,
      eventType,
      preferredContactTime,
      budgetRange,
      unmappedQuestions: unmapped,
      campaignName: leadData.campaign_name,
      adName: leadData.ad_name,
      formId: leadData.form_id,
    };
  }

  /**
   * Ingests parsed Meta lead directly into Prisma Inquiry and Customer tables.
   * Enforces Priority = HIGH and Auto-Maps Lead Source to META_ADS.
   */
  static async ingestMetaLead(params: {
    tenantId: string;
    branchId?: string | null;
    leadData: MetaGraphLeadData;
    rawPayload?: any;
  }) {
    const { tenantId, branchId, leadData } = params;
    const parsed = this.parseMetaFieldData(leadData);

    // 1. Resolve or create 'META_ADS' LeadSource for this tenant
    const sourceCode = 'META_ADS';
    const sourceName = 'Meta Lead Ads (Facebook & Instagram)';

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

    // 2. Format detailed audit notes containing campaign metadata & custom Q&As
    const noteLines: string[] = [
      `[Meta Instant Form Lead Ingestion]`,
      `Campaign: ${parsed.campaignName || 'Meta Campaign'} (ID: ${leadData.campaign_id || 'N/A'})`,
      `Ad: ${parsed.adName || 'Ad Creative'} (ID: ${leadData.ad_id || 'N/A'})`,
      `Form ID: ${leadData.form_id || 'N/A'} | Leadgen ID: ${leadData.id}`,
    ];

    if (parsed.unmappedQuestions.length > 0) {
      noteLines.push('\n[Custom Form Responses]');
      parsed.unmappedQuestions.forEach((q) => {
        noteLines.push(`• ${q.question}: ${q.answer}`);
      });
    }

    const combinedNotes = noteLines.join('\n');

    // 3. Persist through InquiryService with priority HIGH and full field mapping
    const inquiry = await InquiryService.create(tenantId, branchId, {
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      customerPhone: parsed.phone,
      customerWhatsapp: parsed.whatsapp,
      customerEmail: parsed.email,
      inquiryDate: new Date(),
      eventDate: parsed.eventDate,
      eventType: parsed.eventType,
      preferredContactTime: parsed.preferredContactTime,
      budgetRange: parsed.budgetRange,
      leadSourceId: leadSource.id,
      priority: 'HIGH', // Strictly HIGH per founder directives for paid ads
      notes: combinedNotes,
      createdById: null,
    });

    return inquiry;
  }
}
