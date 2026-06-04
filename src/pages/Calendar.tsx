import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameDay, parseISO, isValid, addMonths, subMonths } from 'date-fns';
import { useStore } from '../lib/store';
import { getPersistence } from '../lib/persistence';
import { cn } from '../lib/utils';


interface CalendarEvent {
  id: string;
  type: 'deadline' | 'interview' | 'follow_up' | 'prep';
  date: string;
  time?: string;
  label: string;
  company: string;
  applicationId: string;
  color: string;
}

export function CalendarPage() {
  const { applications, loadApplications } = useStore();
  const db = getPersistence();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [filters, setFilters] = useState({ deadlines: true, interviews: true, followUps: true, prep: true });

  useEffect(() => { loadApplications(); }, []);

  // Build events from applications
  const events: CalendarEvent[] = [];
  applications.forEach(app => {
    if (filters.deadlines && app.deadline) {
      events.push({
        id: `d-${app.id}`,
        type: 'deadline',
        date: app.deadline,
        label: `Deadline: ${app.companyName}`,
        company: app.companyName,
        applicationId: app.id,
        color: 'bg-red-400',
      });
    }
    if (filters.followUps && app.followUpDate && app.stage === 'applied') {
      events.push({
        id: `f-${app.id}`,
        type: 'follow_up',
        date: app.followUpDate,
        label: `Follow-up: ${app.companyName}`,
        company: app.companyName,
        applicationId: app.id,
        color: 'bg-orange-400',
      });
    }
    app.interviews.forEach(interview => {
      if (filters.interviews && interview.scheduledDate && interview.status === 'scheduled') {
        events.push({
          id: `i-${interview.id}`,
          type: 'interview',
          date: interview.scheduledDate,
          time: interview.scheduledTime,
          label: `Interview: ${app.companyName}`,
          company: app.companyName,
          applicationId: app.id,
          color: 'bg-blue-500',
        });
      }
    });
  });

  // Also include reminders
  const reminders = db.getAllReminders().filter(r => !r.isCompleted);
  reminders.forEach(r => {
    if (r.type === 'prep' && filters.prep && r.applicationId) {
      const app = applications.find(a => a.id === r.applicationId);
      if (app) {
        events.push({
          id: `r-${r.id}`,
          type: 'prep',
          date: r.dueDate,
          time: r.dueTime,
          label: r.title,
          company: app.companyName,
          applicationId: r.applicationId,
          color: 'bg-purple-400',
        });
      }
    }
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const getEventsForDate = (date: Date) => {
    return events.filter(e => {
      try {
        const eventDate = parseISO(e.date);
        return isValid(eventDate) && isSameDay(eventDate, date);
      } catch { return false; }
    });
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // For list view: group upcoming events
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = events
    .filter(e => {
      try {
        const d = parseISO(e.date);
        return isValid(d) && d >= today;
      } catch { return false; }
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const groupUpcoming = () => {
    const groups: { label: string; events: CalendarEvent[] }[] = [
      { label: 'Today', events: [] },
      { label: 'Tomorrow', events: [] },
      { label: 'This Week', events: [] },
      { label: 'Next Week', events: [] },
      { label: 'Later', events: [] },
    ];
    const now = new Date();
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    const week = new Date(now); week.setDate(now.getDate() + 7);
    const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 14);

    upcomingEvents.forEach(e => {
      const d = parseISO(e.date);
      if (isToday(d)) groups[0].events.push(e);
      else if (isSameDay(d, tomorrow)) groups[1].events.push(e);
      else if (d <= week) groups[2].events.push(e);
      else if (d <= nextWeek) groups[3].events.push(e);
      else groups[4].events.push(e);
    });
    return groups.filter(g => g.events.length > 0);
  };

  const eventTypeLabel: Record<string, string> = {
    deadline: 'Deadline',
    interview: 'Interview',
    follow_up: 'Follow-up',
    prep: 'Interview Prep',
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500">Deadlines, interviews, and follow-ups</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('month')}
              className={cn('px-3 py-1.5 text-sm transition-colors', viewMode === 'month' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500')}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('px-3 py-1.5 text-sm transition-colors', viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500')}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(filters).map(([key, val]) => {
          const labels: Record<string, string> = { deadlines: 'Deadlines', interviews: 'Interviews', followUps: 'Follow-ups', prep: 'Prep' };
          const colors: Record<string, string> = { deadlines: 'bg-red-400', interviews: 'bg-blue-500', followUps: 'bg-orange-400', prep: 'bg-purple-400' };
          return (
            <button
              key={key}
              onClick={() => setFilters(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                val ? 'border-transparent text-white' : 'border-gray-200 text-gray-400 bg-white'
              )}
              style={val ? { backgroundColor: colors[key].replace('bg-', '') } : {}}
            >
              <span className={cn('w-2 h-2 rounded-full', colors[key])} />
              {labels[key]}
            </button>
          );
        })}
      </div>

      {viewMode === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Calendar Grid */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Month navigation */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="font-semibold text-gray-900">{format(currentMonth, 'MMMM yyyy')}</h2>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 bg-gray-50">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7">
              {/* Empty cells before month starts */}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16 border-b border-r border-gray-100 bg-gray-50/50" />
              ))}

              {days.map(day => {
                const dayEvents = getEventsForDate(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentDay = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'h-16 border-b border-r border-gray-100 p-1 cursor-pointer transition-colors hover:bg-indigo-50',
                      isSelected && 'bg-indigo-50 border-indigo-200',
                    )}
                  >
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-0.5',
                      isCurrentDay ? 'bg-indigo-600 text-white' :
                      isSelected ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700'
                    )}>
                      {format(day, 'd')}
                    </div>
                    <div className="flex flex-wrap gap-0.5">
                      {dayEvents.slice(0, 3).map(e => (
                        <div key={e.id} className={cn('w-2 h-2 rounded-full', e.color)} title={e.label} />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-xs text-gray-400">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day detail panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">
              {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'Select a date'}
            </h3>
            {selectedDateEvents.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Nothing scheduled</p>
            ) : (
              <div className="space-y-2">
                {selectedDateEvents.map(e => (
                  <div
                    key={e.id}
                    onClick={() => navigate(`/applications/${e.applicationId}`)}
                    className="flex items-start gap-2 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', e.color)} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700">{eventTypeLabel[e.type]}</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">{e.company}</p>
                      {e.time && <p className="text-xs text-gray-500">{e.time}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Legend</p>
              <div className="space-y-1.5">
                {[
                  { color: 'bg-red-400', label: 'Deadline' },
                  { color: 'bg-blue-500', label: 'Interview' },
                  { color: 'bg-orange-400', label: 'Follow-up' },
                  { color: 'bg-purple-400', label: 'Interview Prep' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className={cn('w-2.5 h-2.5 rounded-full', item.color)} />
                    <span className="text-xs text-gray-600">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-6">
          {groupUpcoming().length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">No upcoming events</p>
            </div>
          ) : (
            groupUpcoming().map(group => (
              <div key={group.label}>
                <h3 className="font-semibold text-gray-700 text-sm mb-2">{group.label}</h3>
                <div className="space-y-2">
                  {group.events.map(e => (
                    <div
                      key={e.id}
                      onClick={() => navigate(`/applications/${e.applicationId}`)}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm cursor-pointer transition-all"
                    >
                      <div className={cn('w-3 h-3 rounded-full flex-shrink-0', e.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{e.company}</p>
                        <p className="text-xs text-gray-500">{eventTypeLabel[e.type]}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm text-gray-700">{format(parseISO(e.date), 'MMM d')}</p>
                        {e.time && <p className="text-xs text-gray-400">{e.time}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
