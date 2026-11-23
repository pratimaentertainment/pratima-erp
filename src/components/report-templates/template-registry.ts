import type { ReactNode } from 'react';
import { ModernTemplate, ClassicTemplate, CompactTemplate, MinimalTemplate } from './SpecificTemplates';
import { BaseDocumentTemplate } from './BaseDocumentTemplate';
import type { DocumentTemplateProps } from './types';

export const TemplateRegistry: Record<string, React.FC<DocumentTemplateProps>> = {
  'base': BaseDocumentTemplate,
  'modern': ModernTemplate,
  'classic': ClassicTemplate,
  'compact': CompactTemplate,
  'minimal': MinimalTemplate,
};
