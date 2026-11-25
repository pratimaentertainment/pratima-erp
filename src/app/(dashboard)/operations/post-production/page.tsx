import React, { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { PostProductionService } from '@/services/post-production.service';
import { PostProductionClient } from './post-production-client';
import { getVideoPipelineBoardAction } from '@/actions/video-editing.actions';
import { VideoKanbanBoard } from '@/components/features/operations/post-production/kanban/video-kanban-board';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Film, Layers } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Post-Production & Video Kanban | FRAMIQ',
  description:
    'Enterprise editing workflow, video deliverable Kanban, external editor Magic Links, and cloud vaults.',
};

function PostProductionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 border rounded-xl bg-card/60 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-8 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function PostProductionDataLoader({ tenantId }: { tenantId: string }) {
  const [jobsData, editors, videoPipelineRes] = await Promise.all([
    PostProductionService.getPostProductionJobs(tenantId),
    PostProductionService.getAvailableEditors(tenantId),
    getVideoPipelineBoardAction(),
  ]);

  const pipelineData =
    videoPipelineRes.success && videoPipelineRes.data
      ? (videoPipelineRes.data as {
          tasks?: Array<Record<string, unknown>>;
          editors?: Array<Record<string, unknown>>;
          activeBookings?: Array<Record<string, unknown>>;
        })
      : { tasks: [], editors: [], activeBookings: [] };

  return (
    <>
      <TabsContent value="video-workbench" className="space-y-4 focus-visible:outline-none">
        <VideoKanbanBoard
          initialTasks={(pipelineData.tasks as any[]) || []}
          editors={(pipelineData.editors as any[]) || []}
          activeBookings={(pipelineData.activeBookings as any[]) || []}
        />
      </TabsContent>

      <TabsContent value="project-milestones" className="space-y-4 focus-visible:outline-none">
        <PostProductionClient
          initialJobs={jobsData.jobs || []}
          uninitializedBookings={jobsData.uninitializedBookings || []}
          editors={editors || []}
        />
      </TabsContent>
    </>
  );
}

export default async function PostProductionPage() {
  const session = await auth();
  const user = session?.user as { tenantId?: string; id?: string } | undefined;

  if (!user?.tenantId) {
    redirect('/login');
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <Tabs defaultValue="video-workbench" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Post-Production Operations</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Unified command center for project milestone tracking, video deliverable cuts, and external editor Magic Links.
            </p>
          </div>
          <TabsList className="grid w-full sm:w-[440px] grid-cols-2 bg-muted/60 p-1">
            <TabsTrigger
              value="video-workbench"
              className="text-xs flex items-center gap-2 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Film className="h-3.5 w-3.5 text-primary" />
              <span>Video Editor Workbench</span>
            </TabsTrigger>
            <TabsTrigger
              value="project-milestones"
              className="text-xs flex items-center gap-2 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>Project Milestones</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <Suspense fallback={<PostProductionSkeleton />}>
          <PostProductionDataLoader tenantId={user.tenantId} />
        </Suspense>
      </Tabs>
    </div>
  );
}
