import { Prisma } from '@prisma/client';

export type MasterEntityName = 
  | 'state' | 'city' | 'eventType' | 'leadSource' 
  | 'paymentMode' | 'packageCategory' | 'taxRate' | 'serviceComponent';

export interface MasterConfig {
  entity: MasterEntityName;
  title: string;
  fields: {
    name: string;
    label: string;
    type: 'text' | 'number' | 'color' | 'boolean' | 'relation';
    relationEntity?: string; // e.g. for city -> state
    required?: boolean;
  }[];
}

export const MASTER_CONFIGS: Record<MasterEntityName, MasterConfig> = {
  state: {
    entity: 'state',
    title: 'States',
    fields: [
      { name: 'name', label: 'State Name', type: 'text', required: true },
      { name: 'code', label: 'State Code', type: 'text', required: true },
      { name: 'isActive', label: 'Is Active', type: 'boolean' }
    ]
  },
  city: {
    entity: 'city',
    title: 'Cities',
    fields: [
      { name: 'name', label: 'City Name', type: 'text', required: true },
      { name: 'stateId', label: 'State', type: 'relation', relationEntity: 'state', required: true },
      { name: 'isActive', label: 'Is Active', type: 'boolean' }
    ]
  },
  eventType: {
    entity: 'eventType',
    title: 'Event Types',
    fields: [
      { name: 'name', label: 'Event Name', type: 'text', required: true },
      { name: 'code', label: 'Code', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'text' },
      { name: 'color', label: 'Color Code', type: 'color' },
      { name: 'isActive', label: 'Is Active', type: 'boolean' }
    ]
  },
  leadSource: {
    entity: 'leadSource',
    title: 'Lead Sources',
    fields: [
      { name: 'name', label: 'Source Name', type: 'text', required: true },
      { name: 'code', label: 'Code', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'text' },
      { name: 'isActive', label: 'Is Active', type: 'boolean' }
    ]
  },
  paymentMode: {
    entity: 'paymentMode',
    title: 'Payment Modes',
    fields: [
      { name: 'name', label: 'Mode Name', type: 'text', required: true },
      { name: 'code', label: 'Code', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'text' },
      { name: 'isActive', label: 'Is Active', type: 'boolean' }
    ]
  },
  packageCategory: {
    entity: 'packageCategory',
    title: 'Package Categories',
    fields: [
      { name: 'name', label: 'Category Name', type: 'text', required: true },
      { name: 'code', label: 'Code', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'text' },
      { name: 'isActive', label: 'Is Active', type: 'boolean' }
    ]
  },
  taxRate: {
    entity: 'taxRate',
    title: 'Tax Rates',
    fields: [
      { name: 'name', label: 'Tax Name', type: 'text', required: true },
      { name: 'code', label: 'Code', type: 'text', required: true },
      { name: 'percentage', label: 'Percentage (%)', type: 'number', required: true },
      { name: 'isActive', label: 'Is Active', type: 'boolean' }
    ]
  },
  serviceComponent: {
    entity: 'serviceComponent',
    title: 'Service Components',
    fields: [
      { name: 'name', label: 'Component Name', type: 'text', required: true },
      { name: 'code', label: 'Code', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'text' },
      { name: 'isActive', label: 'Is Active', type: 'boolean' }
    ]
  }
};
