import React from 'react';
import { getPublicSelectionBoardAction } from '@/actions/selection.actions';
import { ClientSelectionGallery } from './client-selection-gallery';
import { Camera, AlertCircle } from 'lucide-react';

interface GalleryPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: GalleryPageProps) {
  const { id } = await params;
  const result = await getPublicSelectionBoardAction(id);

  if (result.success && result.data) {
    return {
      title: `${result.data.title} | Photo Selection Gallery`,
      description: `Client photo selection gallery for ${result.data.customer.firstName} ${result.data.customer.lastName}.`,
    };
  }

  return {
    title: 'Photo Selection Gallery | Pratima ERP',
    description: 'Secure client photo proofing and selection portal.',
  };
}

export default async function GallerySelectionPage({ params }: GalleryPageProps) {
  const { id } = await params;
  const initialData = await getPublicSelectionBoardAction(id);

  if (!initialData.success && !initialData.requiresPin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4 p-8 border rounded-2xl bg-card shadow-sm">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Gallery Not Accessible</h1>
          <p className="text-muted-foreground text-sm">
            {initialData.error || 'This photo selection board does not exist or has been removed.'}
          </p>
          <div className="pt-2 text-xs text-muted-foreground border-t">
            Please contact your studio team for an updated link.
          </div>
        </div>
      </div>
    );
  }

  return <ClientSelectionGallery initialData={initialData} selectionId={id} />;
}
