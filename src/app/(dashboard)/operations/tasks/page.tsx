import { getTasksAction } from '@/actions/task.actions';
import { TaskTable } from '@/components/features/operations/tasks/task-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default async function TasksPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const result = await getTasksAction({});
  const tasks = result.success ? result.data || [] : [];
  // @ts-ignore
  const total = result.success && result.data ? result.data.length : 0;

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
          <p className="text-muted-foreground">
            Manage your operational tasks and assignments
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Action buttons like Add Task can go here if we create a standalone modal/form */}
        </div>
      </div>

      <TaskTable data={tasks as any} total={total} />
    </div>
  );
}
