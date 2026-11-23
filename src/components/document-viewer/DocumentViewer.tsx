import * as React from 'react';
import type { DocumentViewerProps } from './types';
import { ImageViewer, PdfViewer, VideoViewer, AudioPlayer, UnknownViewer } from './SpecificViewers';

export function DocumentViewer(props: DocumentViewerProps) {
  switch (props.type) {
    case 'image':
      return <ImageViewer {...props} />;
    case 'pdf':
      return <PdfViewer {...props} />;
    case 'video':
      return <VideoViewer {...props} />;
    case 'audio':
      return <AudioPlayer {...props} />;
    case 'office':
    case 'unknown':
    default:
      return <UnknownViewer {...props} />;
  }
}
