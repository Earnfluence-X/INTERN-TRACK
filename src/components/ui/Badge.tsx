import React from 'react';
import { cn } from '../../lib/utils';
import type { PipelineStage, Priority } from '../../types';
import { STAGE_COLORS, PRIORITY_COLORS } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline';
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      variant === 'outline' ? 'border border-current' : '',
      className
    )}>
      {children}
    </span>
  );
}

export function StageBadge({ stage }: { stage: PipelineStage }) {
  const colors = STAGE_COLORS[stage];
  return (
    <Badge className={cn(colors.bg, colors.text)}>
      {stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const colors = PRIORITY_COLORS[priority];
  return (
    <Badge className={cn(colors.bg, colors.text)}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
}

export function WorkTypeBadge({ workType }: { workType: string }) {
  const colors: Record<string, string> = {
    remote: 'bg-green-100 text-green-700',
    hybrid: 'bg-blue-100 text-blue-700',
    onsite: 'bg-orange-100 text-orange-700',
    unspecified: 'bg-gray-100 text-gray-600',
  };
  return (
    <Badge className={colors[workType] || 'bg-gray-100 text-gray-600'}>
      {workType.charAt(0).toUpperCase() + workType.slice(1)}
    </Badge>
  );
}
