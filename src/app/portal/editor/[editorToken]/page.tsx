import React from 'react';
import { notFound } from 'next/navigation';
import { getDesignerTaskByTokenAction } from '@/actions/editor-portal.actions';
import { AlbumDesignerWorkspace } from '@/components/features/portal/editor-portal/album-designer-workspace';
import { AlertCircle, ArrowLeft, BookOpen, Film } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{
    editorToken: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { editorToken } = await params;
  const res = await getDesignerTaskByTokenAction(editorToken);

  if (res.success && res.data) {
    return {
      title: `${res.data.task.taskType} | Freelancer Design Hub | FRAMIQ`,
      description: `Secure zero-login designer workbench for ${res.data.studio.name}.`,
    };
  }

  return {
    title: 'Freelancer Design Hub | FRAMIQ',
    description: 'Secure Magic Link portal for external creative editors and album designers.',
  };
}

export default async function EditorPortalPage({ params }: PageProps) {
  const { editorToken } = await params;

  if (!editorToken) {
    notFound();
  }

  const res = await getDesignerTaskByTokenAction(editorToken);

  if (!res.success || !res.data) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-2xl border border-border bg-card shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Magic Link Expired or Invalid</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {res.error || 'This editor submission link is invalid, revoked, or has expired.'}
          </p>
          <p className="text-xs text-muted-foreground">
            Please ask your studio director or coordinator for an updated WhatsApp task brief.
          </p>
        </div>
      </div>
    );
  }

  return <AlbumDesignerWorkspace initialData={res.data} editorToken={editorToken} />;
}
