import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors,
  DragOverlay, closestCenter, useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../lib/store';
import { PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS, PRIORITY_COLORS } from '../types';
import type { Application, PipelineStage, Priority } from '../types';
import { cn, formatDeadlineLabel, getDeadlineUrgency, getDaysUntil, formatDate } from '../lib/utils';
import { Button } from '../components/ui/Button';

// Application Card Component
function ApplicationCard({
  app, isDragging = false, compact = false
}: { app: Application; isDragging?: boolean; compact?: boolean }) {
  const navigate = useNavigate();
  const urgency = getDeadlineUrgency(app.deadline);
  const daysInStage = getDaysUntil(app.updatedAt) !== null ? Math.abs(getDaysUntil(app.updatedAt) || 0) : 0;
  const priorityColors = PRIORITY_COLORS[app.priority as Priority];
  const nextInterview = app.interviews
    .filter(i => i.status === 'scheduled')
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];

  return (
    <div
      onClick={() => !isDragging && navigate(`/applications/${app.id}`)}
      className={cn(
        'bg-white rounded-lg border border-gray-200 shadow-sm',
        'border-l-4 cursor-pointer transition-all',
        priorityColors.border,
        isDragging ? 'shadow-xl rotate-2 opacity-90' : 'hover:shadow-md hover:border-gray-300',
        compact ? 'p-2' : 'p-3'
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className={cn('font-semibold text-gray-900 truncate leading-tight', compact ? 'text-xs' : 'text-sm')}>
            {app.companyName}
          </p>
          <p className={cn('text-gray-500 truncate', compact ? 'text-xs' : 'text-xs mt-0.5')}>
            {app.roleTitle}
          </p>
        </div>
        <div className="flex-shrink-0">
          <span className={cn(
            'inline-block w-2 h-2 rounded-full',
            app.priority === 'urgent' ? 'bg-red-500' :
            app.priority === 'high' ? 'bg-orange-400' :
            app.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
          )} title={`${app.priority} priority`} />
        </div>
      </div>

      {!compact && (
        <>
          {/* Location & Work Type */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {app.location && (
              <span className="text-xs text-gray-400 truncate max-w-[100px]">{app.location}</span>
            )}
            {app.workType !== 'unspecified' && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded',
                app.workType === 'remote' ? 'bg-green-100 text-green-700' :
                app.workType === 'hybrid' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
              )}>
                {app.workType}
              </span>
            )}
          </div>

          {/* Deadline */}
          {app.deadline && (
            <div className={cn(
              'mt-2 px-2 py-0.5 rounded text-xs font-medium inline-block',
              urgency === 'overdue' || urgency === 'critical' ? 'bg-red-50 text-red-600' :
              urgency === 'warning' ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-500'
            )}>
              {formatDeadlineLabel(app.deadline)}
            </div>
          )}

          {/* Next Interview */}
          {nextInterview && (
            <div className="mt-2 px-2 py-1 bg-yellow-50 rounded text-xs text-yellow-700">
              Interview: {formatDate(nextInterview.scheduledDate, 'MMM d')}
            </div>
          )}

          {/* Tags */}
          {app.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {app.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
              {app.tags.length > 3 && (
                <span className="text-xs text-gray-400">+{app.tags.length - 3}</span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
            <span className="text-xs text-gray-400">{daysInStage}d in stage</span>
            <div className="flex items-center gap-1">
              {app.interviews.length > 0 && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                  {app.interviews.length} interview{app.interviews.length !== 1 ? 's' : ''}
                </span>
              )}
              {app.notes.length > 0 && (
                <span className="text-xs text-gray-400">{app.notes.length} note{app.notes.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Sortable Card
function SortableCard({ app, compact }: { app: Application; compact: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: app.id,
    data: { type: 'card', app, stage: app.stage },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ApplicationCard app={app} compact={compact} />
    </div>
  );
}

// Column Component
function KanbanColumn({
  stage, apps, isOver, compact, onAddClick
}: {
  stage: PipelineStage;
  apps: Application[];
  isOver: boolean;
  compact: boolean;
  onAddClick: (stage: PipelineStage) => void;
}) {
  const colors = STAGE_COLORS[stage];
  const { setNodeRef } = useDroppable({ id: stage, data: { type: 'column', stage } });

  return (
    <div className={cn(
      'flex-shrink-0 w-72 flex flex-col rounded-xl border-2 transition-colors',
      isOver ? `${colors.border} border-2` : 'border-transparent',
    )}>
      {/* Column Header */}
      <div className={cn('flex items-center justify-between px-3 py-2.5 rounded-t-xl', colors.header)}>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-semibold', colors.text)}>
            {STAGE_LABELS[stage]}
          </span>
          <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', colors.bg, colors.text)}>
            {apps.length}
          </span>
        </div>
        <button
          onClick={() => onAddClick(stage)}
          className={cn('w-5 h-5 rounded flex items-center justify-center hover:opacity-75 transition-opacity', colors.bg, colors.text)}
          title={`Add to ${STAGE_LABELS[stage]}`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 p-2 space-y-2 min-h-[200px] rounded-b-xl transition-colors',
          isOver ? `${colors.bg} ${colors.border}` : 'bg-gray-50/80',
        )}
      >
        <SortableContext items={apps.map(a => a.id)} strategy={verticalListSortingStrategy}>
          {apps.map(app => (
            <SortableCard key={app.id} app={app} compact={compact} />
          ))}
        </SortableContext>

        {apps.length === 0 && (
          <div className="flex items-center justify-center h-20">
            <p className="text-xs text-gray-400">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function BoardPage() {
  const { applications, updateApplicationStage, loadApplications, addToast } = useStore();
  const navigate = useNavigate();
  const [activeApp, setActiveApp] = useState<Application | null>(null);
  const [overStage, setOverStage] = useState<PipelineStage | null>(null);
  const [compact, setCompact] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadApplications(); }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Filter applications
  const filteredApps = applications.filter(app => {
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      if (!app.companyName.toLowerCase().includes(q) && !app.roleTitle.toLowerCase().includes(q)) return false;
    }
    if (priorityFilter && app.priority !== priorityFilter) return false;
    return true;
  });

  // Group by stage
  const pipeline: Record<PipelineStage, Application[]> = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = filteredApps.filter(a => a.stage === stage);
    return acc;
  }, {} as Record<PipelineStage, Application[]>);

  const handleDragStart = (event: DragStartEvent) => {
    const app = event.active.data.current?.app;
    if (app) setActiveApp(app);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) { setOverStage(null); return; }
    const overData = over.data.current;
    if (overData?.type === 'column') {
      setOverStage(overData.stage as PipelineStage);
    } else if (overData?.type === 'card') {
      setOverStage(overData.app?.stage as PipelineStage || null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveApp(null);
    setOverStage(null);

    if (!over) return;

    const activeApp = active.data.current?.app as Application;
    const overData = over.data.current;

    if (!activeApp) return;

    let newStage: PipelineStage | null = null;

    if (overData?.type === 'column') {
      newStage = overData.stage as PipelineStage;
    } else if (overData?.type === 'card') {
      newStage = overData.app?.stage as PipelineStage;
    }

    if (newStage && newStage !== activeApp.stage) {
      updateApplicationStage(activeApp.id, newStage);
      addToast({
        type: 'success',
        message: `Moved "${activeApp.companyName}" to ${STAGE_LABELS[newStage]}`,
      });
    }
  };

  const handleAddClick = (stage: PipelineStage) => {
    navigate(`/applications/new?stage=${stage}`);
  };

  const totalApps = applications.length;
  const filteredTotal = filteredApps.length;

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50">
      {/* Board Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-bold text-gray-900 text-lg">Pipeline Board</h1>
            <span className="text-sm text-gray-400">
              {searchFilter || priorityFilter ? `${filteredTotal} of ${totalApps}` : totalApps} apps
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 w-40 md:w-52"
              />
            </div>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="py-1.5 px-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
            >
              <option value="">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Clear filters */}
            {(searchFilter || priorityFilter) && (
              <Button size="xs" variant="ghost" onClick={() => { setSearchFilter(''); setPriorityFilter(''); }}>
                Clear filters
              </Button>
            )}

            {/* View toggle */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden ml-auto sm:ml-0">
              <button
                onClick={() => setCompact(false)}
                className={cn('px-2.5 py-1.5 text-xs transition-colors', !compact ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}
              >
                Comfortable
              </button>
              <button
                onClick={() => setCompact(true)}
                className={cn('px-2.5 py-1.5 text-xs transition-colors', compact ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}
              >
                Compact
              </button>
            </div>

            <Button size="sm" onClick={() => navigate('/applications/new')}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Board */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-auto p-4"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 min-w-max pb-4">
            {PIPELINE_STAGES.map(stage => (
              <KanbanColumn
                key={stage}
                stage={stage}
                apps={pipeline[stage]}
                isOver={overStage === stage}
                compact={compact}
                onAddClick={handleAddClick}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
            {activeApp && <ApplicationCard app={activeApp} isDragging compact={compact} />}
          </DragOverlay>
        </DndContext>

        {applications.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Your board is empty</h3>
              <p className="text-sm text-gray-500 mb-4">Add applications to start managing your pipeline</p>
              <Button onClick={() => navigate('/applications/new')}>Add First Application</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
