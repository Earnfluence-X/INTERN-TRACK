import { useEffect } from 'react';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from 'recharts';
import { useStore } from '../lib/store';
import { getPersistence } from '../lib/persistence';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { PIPELINE_STAGES, STAGE_LABELS } from '../types';
import { format, subDays, parseISO, isValid } from 'date-fns';

export function AnalyticsPage() {
  const { applications, user, loadApplications } = useStore();
  const db = getPersistence();


  useEffect(() => { loadApplications(); }, []);

  const stats = user?.stats;

  // Pipeline funnel data
  const funnelData = [
    { name: 'Wishlist', value: applications.filter(a => a.stage === 'wishlist').length, fill: '#94a3b8' },
    { name: 'Researching', value: applications.filter(a => a.stage === 'researching').length, fill: '#3b82f6' },
    { name: 'Ready', value: applications.filter(a => a.stage === 'ready_to_apply').length, fill: '#8b5cf6' },
    { name: 'Applied', value: applications.filter(a => a.stage === 'applied').length, fill: '#14b8a6' },
    { name: 'Phone Screen', value: applications.filter(a => a.stage === 'phone_screen').length, fill: '#f97316' },
    { name: 'Interviewing', value: applications.filter(a => ['interview_scheduled', 'interview_completed'].includes(a.stage)).length, fill: '#eab308' },
    { name: 'Offer', value: applications.filter(a => a.stage === 'offer_received').length, fill: '#f59e0b' },
    { name: 'Accepted', value: applications.filter(a => a.stage === 'accepted').length, fill: '#10b981' },
  ].filter(d => d.value > 0);

  // Weekly applications bar chart (last 8 weeks)
  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const weekStart = subDays(new Date(), (7 - i) * 7);
    const weekEnd = subDays(new Date(), (7 - i - 1) * 7);
    const count = applications.filter(a => {
      try {
        const d = parseISO(a.createdAt);
        return isValid(d) && d >= weekStart && d < weekEnd;
      } catch { return false; }
    }).length;
    return { week: format(weekStart, 'MMM d'), applications: count };
  });

  // Source breakdown
  const sourceData = Object.entries(
    applications.reduce((acc, a) => {
      const s = a.source || 'unknown';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value
  }));

  const PIE_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Daily logs heat map (last 30 days)
  const dailyLogs = db.getDailyLogs(30).reverse();
  const heatMapData = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const log = dailyLogs.find(l => l.date === dateStr);
    return {
      date: dateStr,
      label: format(date, 'MMM d'),
      total: log ? (log.applicationsSubmitted + log.interviewsCompleted + log.contactsReached) : 0,
    };
  });

  const maxHeatMap = Math.max(...heatMapData.map(d => d.total), 1);

  const metricCards = [
    { label: 'Response Rate', value: `${stats?.responseRate || 0}%`, desc: 'of applied applications responded', color: 'text-teal-600 bg-teal-50' },
    { label: 'Interview Rate', value: `${stats?.interviewRate || 0}%`, desc: 'of applied applications got interviews', color: 'text-yellow-600 bg-yellow-50' },
    { label: 'Offer Rate', value: `${stats?.offerRate || 0}%`, desc: 'of interviews led to offers', color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Avg Response Time', value: `${stats?.averageResponseTime || 0}d`, desc: 'days from apply to first response', color: 'text-blue-600 bg-blue-50' },
  ];

  const topSource = sourceData.sort((a, b) => b.value - a.value)[0];
  const mostProductiveStage = PIPELINE_STAGES.reduce((acc, stage) => {
    const count = applications.filter(a => a.stage === stage).length;
    return count > acc.count ? { stage, count } : acc;
  }, { stage: 'wishlist', count: 0 });

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500">Insights from your {applications.length} applications</p>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">No data yet</h3>
          <p className="text-sm text-gray-500">Add applications to see analytics and insights</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {metricCards.map(m => (
              <Card key={m.label} padding="md">
                <div className={cn('text-2xl font-bold mb-1', m.color.split(' ')[0])}>{m.value}</div>
                <div className="text-sm font-medium text-gray-900">{m.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{m.desc}</div>
              </Card>
            ))}
          </div>

          {/* Funnel */}
          <Card padding="md">
            <h2 className="font-semibold text-gray-900 mb-4 text-sm">Application Pipeline</h2>
            {funnelData.length > 0 ? (
              <div className="space-y-2">
                {funnelData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-28 text-xs text-right text-gray-600 flex-shrink-0">{item.name}</div>
                    <div className="flex-1">
                      <div
                        className="h-8 rounded transition-all flex items-center justify-end pr-2"
                        style={{
                          width: `${(item.value / funnelData[0].value) * 100}%`,
                          backgroundColor: item.fill,
                          minWidth: '2rem',
                        }}
                      >
                        <span className="text-white text-xs font-semibold">{item.value}</span>
                      </div>
                    </div>
                    {i > 0 && funnelData[i - 1].value > 0 && (
                      <div className="text-xs text-gray-400 w-14 flex-shrink-0">
                        {Math.round((item.value / funnelData[i - 1].value) * 100)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Add applications to see your funnel</p>
            )}
          </Card>

          {/* Weekly Chart */}
          <Card padding="md">
            <h2 className="font-semibold text-gray-900 mb-4 text-sm">Applications Over Time (Last 8 Weeks)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="applications" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Source Breakdown */}
            <Card padding="md">
              <h2 className="font-semibold text-gray-900 mb-4 text-sm">Source Breakdown</h2>
              {sourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {sourceData.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: '8px' }} />
                    <Legend formatter={(value) => <span className="text-xs text-gray-600">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">No source data</p>
              )}
            </Card>

            {/* Streak & Activity */}
            <Card padding="md">
              <h2 className="font-semibold text-gray-900 mb-4 text-sm">Daily Activity (Last 30 Days)</h2>
              <div className="grid grid-cols-10 gap-1 mb-4">
                {heatMapData.map(d => (
                  <div
                    key={d.date}
                    title={`${d.label}: ${d.total} actions`}
                    className="aspect-square rounded-sm transition-colors"
                    style={{
                      backgroundColor: d.total === 0 ? '#f1f5f9' :
                        d.total < maxHeatMap * 0.25 ? '#c7d2fe' :
                        d.total < maxHeatMap * 0.5 ? '#818cf8' :
                        d.total < maxHeatMap * 0.75 ? '#6366f1' : '#4338ca',
                    }}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{stats?.currentStreak || 0}</div>
                  <div className="text-xs text-gray-500">Current Streak (days)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-700">{stats?.longestStreak || 0}</div>
                  <div className="text-xs text-gray-500">Longest Streak (days)</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Insights */}
          <Card padding="md">
            <h2 className="font-semibold text-gray-900 mb-4 text-sm">Insights</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                topSource && {
                  label: 'Best Source',
                  value: topSource.name,
                  desc: `${topSource.value} application${topSource.value !== 1 ? 's' : ''}`,
                },
                stats?.averageResponseTime && {
                  label: 'Avg Response Time',
                  value: `${stats.averageResponseTime} days`,
                  desc: 'from application to first response',
                },
                mostProductiveStage.count > 0 && {
                  label: 'Most Applications',
                  value: STAGE_LABELS[mostProductiveStage.stage as keyof typeof STAGE_LABELS],
                  desc: `${mostProductiveStage.count} currently in this stage`,
                },
                applications.filter(a => a.stage === 'rejected').length > 0 && {
                  label: 'Rejections',
                  value: `${applications.filter(a => a.stage === 'rejected').length}`,
                  desc: 'rejections received (normal!)',
                },
                applications.filter(a => a.deadline && !['rejected', 'withdrawn', 'accepted'].includes(a.stage)).length > 0 && {
                  label: 'Active Deadlines',
                  value: `${applications.filter(a => a.deadline && !['rejected', 'withdrawn', 'accepted'].includes(a.stage)).length}`,
                  desc: 'upcoming application deadlines',
                },
              ].filter(Boolean).map((insight, i) => insight && (
                <div key={i} className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <p className="text-xs text-indigo-500 font-medium">{insight.label}</p>
                  <p className="text-base font-bold text-indigo-900 mt-0.5">{insight.value}</p>
                  <p className="text-xs text-indigo-600 mt-0.5">{insight.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
