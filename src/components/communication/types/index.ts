import * as React from 'react';

export type CommunicationChannel = 'in-app' | 'email' | 'sms' | 'whatsapp' | 'push' | 'internal' | 'broadcast';
export type NotificationType = 'success' | 'info' | 'warning' | 'danger' | 'reminder' | 'approval' | 'rejection' | 'assignment' | 'comment' | 'mention' | 'system';
export type CommunicationStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'bounced';

export interface CommunicationActor {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
}

export interface CommunicationItemConfig {
  id: string;
  channel: CommunicationChannel;
  type: NotificationType;
  title: string;
  body?: string;
  previewText?: string;
  timestamp: Date | string;
  status: CommunicationStatus;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  isRead?: boolean;
  sender?: CommunicationActor;
  recipients?: CommunicationActor[];
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

export interface CommunicationFilterConfig {
  channels?: CommunicationChannel[];
  types?: NotificationType[];
  statuses?: CommunicationStatus[];
  dateRange?: { start: Date; end: Date };
  searchQuery?: string;
  isUnreadOnly?: boolean;
}
