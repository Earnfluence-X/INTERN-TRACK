import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { getPersistence } from '../lib/persistence';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StageBadge } from '../components/ui/Badge';
import { formatDate, formatRelativeDate, getDeadlineUrgency, formatDeadlineLabel } from '../lib/utils';
import { PIPELINE_STAGES } from '../types';
import { cn } from '../lib/utils';

export function DashboardPage() {
  const { user, applications, loadApplications } = useStore();
  const navigate = useNavigate();
  const db = getPersistence();

  useEffect(() => { loadApplications(); }, []);

  const stats = user?.stats;
  const upcomingDeadlines = applications
    .filter(a => a.deadline && !['rejected', 'withdrawn', 'accepted'].includes(a.stage))
    .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))
    .slice(0, 5);

  const followUpAlerts = applications
    .filter(a => a.followUpDate && a.stage === 'applied')
    .sort((a, b) => (a.followUpDate || '').localeCompare(b.followUpDate || ''))
    .slice(0, 5);

  const recentActivity = applications
    .flatMap(a => a.timeline.map(e => ({ ...e, appId: a.id, company: a.companyName, role: a.roleTitle })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  const pipeline = db.getApplicationsByPipeline();
  const weeklyGoal = user?.preferences.weeklyApplicationGoal || 10;
  const weeklyApps = stats?.weeklyApplications || 0;
  const weeklyProgress = Math.min(100, Math.round((weeklyApps / weeklyGoal) * 100));

  const urgencyClass = (dateStr: string | null | undefined) => {
    const urgency = getDeadlineUrgency(dateStr);
    if (urgency === 'overdue' || urgency === 'critical') return 'text-red-600 bg-red-50 border-red-100';
    if (urgency === 'warning') return 'text-orange-600 bg-orange-50 border-orange-100';
    return 'text-green-700 bg-green-50 border-green-100';
  };

  const pipelineGroups = [
    { label: 'Pre-Apply', count: (pipeline.wishlist?.length || 0) + (pipeline.researching?.length || 0) + (pipeline.ready_to_apply?.length || 0), color: 'bg-slate-400' },
    { label: 'Applied', count: pipeline.applied?.length || 0, color: 'bg-teal-500' },
    { label: 'Interviewing', count: (pipeline.phone_screen?.length || 0) + (pipeline.interview_scheduled?.length || 0) + (pipeline.interview_completed?.length || 0), color: 'bg-yellow-500' },
    { label: 'Offer', count: pipeline.offer_received?.length || 0, color: 'bg-amber-500' },
    { label: 'Accepted', count: pipeline.accepted?.length || 0, color: 'bg-emerald-500' },
  ];
  const maxGroupCount = Math.max(...pipelineGroups.map(g => g.count), 1);

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            {user?.fullName ? `Hello, ${user.fullName.split(' ')[0]}` : 'Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {applications.length === 0 ? 'Start tracking your internship applications' : `Tracking ${applications.length} application${applications.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link to="/applications/new">
          <Button size="sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Application
          </Button>
        </Link>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Apps', value: stats.totalApplications, color: 'text-gray-900' },
            { label: 'Active', value: stats.activeApplications, color: 'text-blue-600' },
            { label: 'Response Rate', value: `${stats.responseRate}%`, color: 'text-teal-600' },
            { label: 'Interviews', value: stats.interviewsCompleted, color: 'text-yellow-600' },
            { label: 'Offers', value: stats.offersReceived, color: 'text-emerald-600' },
            { label: 'Streak', value: `${stats.currentStreak}d`, color: 'text-indigo-600' },
          ].map(s => (
            <Card key={s.label} padding="sm" className="text-center">
              <div className={cn('text-2xl font-bold', s.color)}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {applications.length === 0 && (
        <Card padding="lg" className="text-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Start Your Internship Journey</h2>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                Add your first application to begin tracking your pipeline, deadlines, and interviews.
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/applications/new')}>
                Add First Application
              </Button>
              <Button variant="outline" onClick={() => navigate('/board')}>
                View Board
              </Button>
            </div>
          </div>
        </Card>
      )}

      {applications.length > 0 && (
        <>
          {/* Pipeline Snapshot & Weekly Goal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pipeline Snapshot */}
            <Card padding="md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 text-sm">Pipeline Snapshot</h2>
                <Link to="/board" className="text-xs text-indigo-600 hover:underline">View Board</Link>
              </div>
              <div className="space-y-2">
                {pipelineGroups.map(g => (
                  <div key={g.label} className="flex items-center gap-3">
                    <div className="text-xs text-gray-500 w-20 text-right flex-shrink-0">{g.label}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all flex items-center justify-end pr-2', g.color)}
                        style={{ width: `${(g.count / maxGroupCount) * 100}%`, minWidth: g.count > 0 ? '2rem' : '0' }}
                      >
                        {g.count > 0 && <span className="text-white text-xs font-medium">{g.count}</span>}
                      </div>
                    </div>
                    {g.count === 0 && <span className="text-xs text-gray-400">0</span>}
                  </div>
                ))}
              </div>
            </Card>

            {/* Weekly Goal */}
            <Card padding="md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 text-sm">Weekly Progress</h2>
                <span className="text-xs text-gray-500">{weeklyApps}/{weeklyGoal} this week</span>
              </div>
              <div className="mb-3">
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', weeklyProgress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500')}
                    style={{ width: `${weeklyProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{weeklyProgress}% of goal</span>
                  {weeklyProgress >= 100 && <span className="text-emerald-600 font-medium">Goal reached!</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500">Current Streak</p>
                  <p className="text-lg font-bold text-indigo-600">{stats?.currentStreak || 0} days</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Longest Streak</p>
                  <p className="text-lg font-bold text-gray-700">{stats?.longestStreak || 0} days</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Deadlines & Follow-ups */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Upcoming Deadlines */}
            <Card padding="md">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900 text-sm">Upcoming Deadlines</h2>
                <Link to="/calendar" className="text-xs text-indigo-600 hover:underline">View Calendar</Link>
              </div>
              {upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No upcoming deadlines</p>
              ) : (
                <div className="space-y-2">
                  {upcomingDeadlines.map(app => {
                    const urgency = urgencyClass(app.deadline);
                    return (
                      <div
                        key={app.id}
                        onClick={() => navigate(`/applications/${app.id}`)}
                        className={cn('flex items-center justify-between p-2.5 rounded-lg border cursor-pointer hover:shadow-sm transition-all', urgency)}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{app.companyName}</p>
                          <p className="text-xs opacity-75 truncate">{app.roleTitle}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-xs font-semibold">{formatDeadlineLabel(app.deadline)}</p>
                          <p className="text-xs opacity-75">{formatDate(app.deadline || '', 'MMM d')}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Follow-up Alerts */}
            <Card padding="md">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900 text-sm">Follow-up Alerts</h2>
              </div>
              {followUpAlerts.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No pending follow-ups</p>
              ) : (
                <div className="space-y-2">
                  {followUpAlerts.map(app => (
                    <div key={app.id} className="flex items-center justify-between p-2.5 rounded-lg border border-orange-100 bg-orange-50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-orange-800 truncate">{app.companyName}</p>
                        <p className="text-xs text-orange-600 truncate">{app.roleTitle}</p>
                        <p className="text-xs text-orange-500">Follow-up due {formatRelativeDate(app.followUpDate)}</p>
                      </div>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => navigate(`/applications/${app.id}`)}
                        className="ml-2 flex-shrink-0 text-orange-700 border-orange-300 hover:bg-orange-100"
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Recent Activity */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 text-sm">Recent Activity</h2>
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((event, i) => (
                  <div key={`${event.id}-${i}`} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-700">
                        <button
                          onClick={() => navigate(`/applications/${event.appId}`)}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          {event.company}
                        </button>
                        {' '}{event.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatRelativeDate(event.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Stage overview */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 text-sm">Applications by Stage</h2>
              <Link to="/board" className="text-xs text-indigo-600 hover:underline">View All</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {PIPELINE_STAGES.map(stage => {
                const count = pipeline[stage]?.length || 0;
                if (count === 0) return null;
                return (
                  <button
                    key={stage}
                    onClick={() => navigate('/board')}
                    className="text-left p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="text-lg font-bold text-gray-900">{count}</div>
                    <StageBadge stage={stage} />
                  </button>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
