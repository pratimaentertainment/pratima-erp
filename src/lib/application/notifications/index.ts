export type NotificationTransport = 'in-app' | 'email' | 'sms' | 'whatsapp' | 'push';

export interface NotificationPayload {
  recipientId: string;
  subject: string;
  body: string;
  transports: NotificationTransport[];
  metadata?: Record<string, any>;
}

export interface NotificationService {
  send(payload: NotificationPayload): Promise<void>;
  sendBulk(payloads: NotificationPayload[]): Promise<void>;
}

export class BaseNotificationService implements NotificationService {
  async send(payload: NotificationPayload): Promise<void> {
    // Abstract dispatcher
    console.log('[Notification Dispatched]', payload.transports, payload.subject);
  }

  async sendBulk(payloads: NotificationPayload[]): Promise<void> {
    await Promise.all(payloads.map(p => this.send(p)));
  }
}
