'use client';

import * as React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { KanbanCard, KanbanCardTask } from './kanban-card';
import { Badge } from '@/components/ui/badge';
import { Film } from 'lucide-react';

export interface KanbanColumnDefinition {
  id: string;
  title: string;
  subtitle: string;
  dotColor: string;
  badgeBg: string;
  headerBorder: string;
}

interface KanbanColumnProps {
  column: KanbanColumnDefinition;
  tasks: KanbanCardTask[];
  onEditTask: (task: KanbanCardTask) => void;
  onQuickWhatsApp: (task: KanbanCardTask) => void;
}

export function KanbanColumn({ column, tasks, onEditTask, onQuickWhatsApp }: KanbanColumnProps) {
  return (
    <div className="flex flex-col flex-1 min-w-[280px] max-w-[340px] rounded-xl bg-muted/40 border border-border/60 shadow-xs">
      {/* Column Header */}
      <div className={`p-3.5 border-b border-border/50 border-t-2 ${column.headerBorder} rounded-t-xl bg-card/60 backdrop-blur-xs`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${column.dotColor}`} />
            <h3 className="font-semibold text-sm text-foreground tracking-tight">
              {column.title}
            </h3>
          </div>
          <Badge
            variant="secondary"
            className={`text-xs font-mono font-semibold px-2 py-0.5 ${column.badgeBg}`}
          >
            {tasks.length}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground line-clamp-1">
          {column.subtitle}
        </p>
      </div>

      {/* Droppable Card List Area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-2.5 min-h-[450px] max-h-[calc(100vh-270px)] overflow-y-auto rounded-b-xl transition-colors duration-150 ${
              snapshot.isDraggingOver
                ? 'bg-primary/5 ring-1 ring-primary/20 ring-inset'
                : 'bg-transparent'
            }`}
          >
            {tasks.map((task, index) => (
              <KanbanCard
                key={task.id}
                task={task}
                index={index}
                onEdit={onEditTask}
                onQuickWhatsApp={onQuickWhatsApp}
              />
            ))}

            {provided.placeholder}

            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="h-44 border-2 border-dashed border-border/60 rounded-lg flex flex-col items-center justify-center text-center p-4 text-muted-foreground/60">
                <Film className="h-6 w-6 mb-2 stroke-1" />
                <p className="text-xs font-medium">No cuts in this stage</p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                  Drag items here to advance workflow
                </p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
