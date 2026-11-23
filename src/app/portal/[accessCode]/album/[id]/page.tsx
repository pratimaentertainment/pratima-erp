import React from 'react';
import { notFound } from 'next/navigation';
import { getAlbumProofingAction } from '@/actions/album.actions';
import { AlbumFlipbookViewer } from '@/components/features/portal/album-review/album-flipbook-viewer';
import { AlertCircle, ArrowLeft, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{
    accessCode: string;
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { accessCode, id } = await params;
  const res = await getAlbumProofingAction({ albumId: id, accessCode });

  if (res.success && res.data) {
    return {
      title: `${res.data.title} | Digital e-Album Proofing | Pratima ERP`,
      description: `Review spreads, drop spatial pin modification notes, and approve digital albums for ${res.data.customer.name}.`,
    };
  }

  return {
    title: 'Digital e-Album Proofing | Pratima ERP',
    description: 'Interactive client album proofing and spatial pin feedback suite.',
  };
}

export default async function AlbumReviewPage({ params }: PageProps) {
  const { accessCode, id } = await params;

  if (!accessCode || !id) {
    notFound();
  }

  const res = await getAlbumProofingAction({ albumId: id, accessCode });

  if (!res.success || !res.data) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-2xl border border-border bg-card shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Album Proof Not Accessible</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {res.error || 'This digital album could not be loaded or your access code is invalid.'}
          </p>
          <div className="pt-2">
            <Link
              href={`/portal/${accessCode}`}
              className={cn(buttonVariants({ variant: 'default' }), 'w-full gap-2')}
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Portal Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AlbumFlipbookViewer
      initialAlbum={res.data}
      accessCode={accessCode}
      backUrl={`/portal/${accessCode}`}
    />
  );
}
