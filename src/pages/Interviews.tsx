import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Card } from '../components/ui/Card';
import { formatDate, cn } from '../lib/utils';
import type { Interview } from '../types';

export function InterviewsPage() {
  const { applications, loadApplications } = useStore();
  const navigate = useNavigate();

  useEffect(() => { loadApplications(); }, []);

  // Flatten all interviews
  const allInterviews: Array<Interview & { companyName: string; roleTitle: string; applicationId: string }> = [];
  applications.forEach(app => {
    app.interviews.forEach(interview => {
      allInterviews.push({ ...interview, companyName: app.companyName, roleTitle: app.roleTitle, applicationId: app.id });
    });
  });

  const sorted = allInterviews.sort((a, b) => {
    const aDate = new Date(`${a.scheduledDate}T${a.scheduledTime || '00:00'}`);
    const bDate = new Date(`${b.scheduledDate}T${b.scheduledTime || '00:00'}`);
    return bDate.getTime() - aDate.getTime();
  });

  const upcoming = sorted.filter(i => {
    const d = new Date(`${i.scheduledDate}T${i.scheduledTime || '00:00'}`);
    return d >= new Date() && i.status === 'scheduled';
  });

  const past = sorted.filter(i => {
    const d = new Date(`${i.scheduledDate}T${i.scheduledTime || '00:00'}`);
    return d < new Date() || i.status === 'completed';
  });

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
    rescheduled: 'bg-yellow-100 text-yellow-700',
    no_show: 'bg-gray-100 text-gray-600',
  };

  const formatRound = (round: string) => round.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const InterviewItem = ({ interview }: { interview: typeof allInterviews[0] }) => (
    <div
      className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => navigate(`/applications/${interview.applicationId}`)}
    >
      <div className="w-10 h-10 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
        R{interview.roundNumber}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900">{interview.companyName}</p>
            <p className="text-sm text-gray-500">{interview.roleTitle}</p>
            <p className="text-sm text-gray-700 mt-1">{formatRound(interview.round)}</p>
          </div>
          <span className={cn('text-xs px-2 py-1 rounded-full font-medium flex-shrink-0', statusColors[interview.status])}>
            {interview.status}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span>{formatDate(interview.scheduledDate, 'MMM d, yyyy')}</span>
          {interview.scheduledTime && <span>{interview.scheduledTime}</span>}
          {interview.duration && <span>{interview.duration} min</span>}
          <span className="capitalize">{interview.format.replace(/_/g, ' ')}</span>
        </div>
        {interview.interviewers.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">With: {interview.interviewers.join(', ')}</p>
        )}
        {interview.preparation.length > 0 && (
          <div className="mt-1">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-32">
              <div
                className="h-full bg-green-400 rounded-full"
                style={{ width: `${(interview.preparation.filter(p => p.isCompleted).length / interview.preparation.length) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {interview.preparation.filter(p => p.isCompleted).length}/{interview.preparation.length} prep tasks done
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Interviews</h1>
        <p className="text-sm text-gray-500">
          {allInterviews.length} total · {upcoming.length} upcoming
        </p>
      </div>

      {allInterviews.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">No interviews yet</h3>
          <p className="text-sm text-gray-500">Interviews will appear here when you schedule them on applications</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-700 text-sm mb-3">Upcoming ({upcoming.length})</h2>
              <div className="space-y-2">
                {upcoming.map(i => <InterviewItem key={i.id} interview={i} />)}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-700 text-sm mb-3">Past & Completed ({past.length})</h2>
              <div className="space-y-2">
                {past.map(i => <InterviewItem key={i.id} interview={i} />)}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-100">
            {[
              { label: 'Total', value: allInterviews.length },
              { label: 'Completed', value: allInterviews.filter(i => i.status === 'completed').length },
              { label: 'Upcoming', value: upcoming.length },
              { label: 'Cancelled', value: allInterviews.filter(i => i.status === 'cancelled').length },
            ].map(s => (
              <Card key={s.label} padding="sm" className="text-center">
                <div className="text-xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
