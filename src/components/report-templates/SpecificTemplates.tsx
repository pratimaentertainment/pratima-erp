import * as React from 'react';
import { BaseDocumentTemplate } from './BaseDocumentTemplate';
import type { DocumentTemplateProps } from './types';

export function ModernTemplate(props: DocumentTemplateProps) {
  return <BaseDocumentTemplate {...props} className="font-sans" />;
}

export function ClassicTemplate(props: DocumentTemplateProps) {
  return <BaseDocumentTemplate {...props} className="font-serif" />;
}

export function CompactTemplate(props: DocumentTemplateProps) {
  return <BaseDocumentTemplate {...props} className="text-xs p-4" />;
}

export function MinimalTemplate(props: DocumentTemplateProps) {
  return <BaseDocumentTemplate {...props} className="grayscale" />;
}
