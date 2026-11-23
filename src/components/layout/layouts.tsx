'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { FADE_IN_VARIANTS } from '@/components/animation';
import { motion, type HTMLMotionProps } from 'framer-motion';

// --- Module List Layout ---
export interface ModuleListLayoutProps extends HTMLMotionProps<"div"> {
  header: React.ReactNode;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  children: React.ReactNode;
}
export function ModuleListLayout({ header, actions, filters, children, className, ...props }: ModuleListLayoutProps) {
  return (
    <motion.div variants={FADE_IN_VARIANTS} initial="hidden" animate="visible" exit="exit" className={cn("flex flex-col h-full", className)} {...props}>
      <div className="flex flex-col gap-4 p-6 border-b border-border bg-background/95 backdrop-blur z-[var(--z-sticky)] sticky top-0">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold tracking-tight">{header}</div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {filters && <div className="flex items-center gap-2">{filters}</div>}
      </div>
      <div className="flex-1 p-6 overflow-auto">
        {children}
      </div>
    </motion.div>
  );
}

// --- Module Detail Layout ---
export interface ModuleDetailLayoutProps extends HTMLMotionProps<"div"> {
  breadcrumbs?: React.ReactNode;
  header: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}
export function ModuleDetailLayout({ breadcrumbs, header, actions, tabs, sidebar, children, className, ...props }: ModuleDetailLayoutProps) {
  return (
    <motion.div variants={FADE_IN_VARIANTS} initial="hidden" animate="visible" exit="exit" className={cn("flex flex-col h-full", className)} {...props}>
      <div className="flex flex-col gap-4 p-6 border-b border-border bg-background/95 backdrop-blur z-[var(--z-sticky)] sticky top-0">
        {breadcrumbs && <div className="text-sm text-muted-foreground">{breadcrumbs}</div>}
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold tracking-tight">{header}</div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {tabs && <div className="mt-2">{tabs}</div>}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
        {sidebar && (
          <div className="w-80 border-l border-border bg-muted/10 p-6 overflow-auto hidden lg:block">
            {sidebar}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// --- Dashboard Layout ---
export interface DashboardLayoutProps extends HTMLMotionProps<"div"> {
  header: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}
export function DashboardLayout({ header, actions, children, className, ...props }: DashboardLayoutProps) {
  return (
    <motion.div variants={FADE_IN_VARIANTS} initial="hidden" animate="visible" exit="exit" className={cn("flex flex-col h-full", className)} {...props}>
      <div className="flex items-center justify-between p-6 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">{header}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="flex-1 p-6 pt-0 overflow-auto">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
          {children}
        </div>
      </div>
    </motion.div>
  );
}

// --- Settings Layout ---
export interface SettingsLayoutProps extends HTMLMotionProps<"div"> {
  header: React.ReactNode;
  description?: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}
export function SettingsLayout({ header, description, sidebar, children, className, ...props }: SettingsLayoutProps) {
  return (
    <motion.div variants={FADE_IN_VARIANTS} initial="hidden" animate="visible" exit="exit" className={cn("flex flex-col h-full", className)} {...props}>
      <div className="p-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold tracking-tight">{header}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        <div className="w-full md:w-64 border-r border-border p-4 overflow-auto">
          {sidebar}
        </div>
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- Master Data Layout ---
export interface MasterDataLayoutProps extends HTMLMotionProps<"div"> {
  header: React.ReactNode;
  directory: React.ReactNode;
  children: React.ReactNode;
}
export function MasterDataLayout({ header, directory, children, className, ...props }: MasterDataLayoutProps) {
  return (
    <motion.div variants={FADE_IN_VARIANTS} initial="hidden" animate="visible" exit="exit" className={cn("flex flex-col h-full", className)} {...props}>
      <div className="p-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold tracking-tight">{header}</h1>
      </div>
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        <div className="w-full md:w-72 border-r border-border bg-muted/10 overflow-auto">
          {directory}
        </div>
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </div>
    </motion.div>
  );
}

// --- Create Form Layout ---
export interface CreateFormLayoutProps extends HTMLMotionProps<"div"> {
  header: React.ReactNode;
  description?: React.ReactNode;
  stepper?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}
export function CreateFormLayout({ header, description, stepper, children, footer, className, ...props }: CreateFormLayoutProps) {
  return (
    <motion.div variants={FADE_IN_VARIANTS} initial="hidden" animate="visible" exit="exit" className={cn("flex flex-col h-full max-w-5xl mx-auto bg-card border-x shadow-sm", className)} {...props}>
      <div className="flex flex-col gap-4 p-8 border-b border-border z-[var(--z-sticky)] sticky top-0 bg-card">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{header}</h1>
          {description && <p className="text-muted-foreground mt-1">{description}</p>}
        </div>
        {stepper && <div>{stepper}</div>}
      </div>
      <div className="flex-1 p-8 overflow-auto">
        {children}
      </div>
      {footer && (
        <div className="p-6 border-t border-border bg-muted/10 sticky bottom-0 z-[var(--z-sticky)]">
          {footer}
        </div>
      )}
    </motion.div>
  );
}

// --- Edit Form Layout ---
export interface EditFormLayoutProps extends HTMLMotionProps<"div"> {
  header: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}
export function EditFormLayout({ header, actions, children, footer, className, ...props }: EditFormLayoutProps) {
  return (
    <motion.div variants={FADE_IN_VARIANTS} initial="hidden" animate="visible" exit="exit" className={cn("flex flex-col h-full bg-background", className)} {...props}>
      <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background z-[var(--z-sticky)]">
        <h2 className="text-xl font-bold tracking-tight">{header}</h2>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl">
          {children}
        </div>
      </div>
      {footer && (
        <div className="p-4 border-t border-border bg-background sticky bottom-0 z-[var(--z-sticky)] flex justify-end">
          {footer}
        </div>
      )}
    </motion.div>
  );
}
