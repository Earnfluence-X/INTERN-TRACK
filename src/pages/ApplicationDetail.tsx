import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { getPersistence } from '../lib/persistence';
import { Button } from '../components/ui/Button';
import { StageBadge, PriorityBadge, WorkTypeBadge } from '../components/ui/Badge';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Input, Textarea, Select } from '../components/ui/Input';
import { TagInput } from '../components/ui/TagInput';
import { Card } from '../components/ui/Card';
import { formatDate, formatRelativeDate, formatDeadlineLabel, getDeadlineUrgency, formatSalary, cn } from '../lib/utils';
import type { Application, PipelineStage, Interview, InterviewRound } from '../types';
import { PIPELINE_STAGES, STAGE_LABELS } from '../types';

type Tab = 'overview' | 'interviews' | 'documents' | 'notes' | 'timeline';

function InterviewForm({ applicationId, onClose, onSave }: { applicationId: string; onClose: () => void; onSave: () => void }) {
  const db = getPersistence();
  const { loadApplications } = useStore();
  const [form, setForm] = useState({
    round: 'phone_screen' as InterviewRound,
    scheduledDate: '',
    scheduledTime: '',
    duration: '60',
    format: 'video',
    location: '',
    meetingLink: '',
    interviewers: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    if (!form.scheduledDate) return;
    setSaving(true);
    db.addInterview(applicationId, {
      round: form.round,
      scheduledDate: form.scheduledDate,
      scheduledTime: form.scheduledTime,
      duration: parseInt(form.duration) || 60,
      format: form.format as Interview['format'],
      location: form.location,
      meetingLink: form.meetingLink,
      interviewers: form.interviewers ? form.interviewers.split(',').map(s => s.trim()) : [],
      notes: form.notes,
    });
    loadApplications();
    setSaving(false);
    onSave();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Interview Round"
          value={form.round}
          onChange={e => setForm(prev => ({ ...prev, round: e.target.value as InterviewRound }))}
          options={[
            { value: 'phone_screen', label: 'Phone Screen' },
            { value: 'technical', label: 'Technical' },
            { value: 'behavioral', label: 'Behavioral' },
            { value: 'case_study', label: 'Case Study' },
            { value: 'take_home', label: 'Take Home' },
            { value: 'panel', label: 'Panel' },
            { value: 'final', label: 'Final Round' },
            { value: 'other', label: 'Other' },
          ]}
        />
        <Select
          label="Format"
          value={form.format}
          onChange={e => setForm(prev => ({ ...prev, format: e.target.value }))}
          options={[
            { value: 'video', label: 'Video Call' },
            { value: 'phone', label: 'Phone Call' },
            { value: 'in_person', label: 'In Person' },
            { value: 'take_home', label: 'Take Home' },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Date *"
          type="date"
          value={form.scheduledDate}
          onChange={e => setForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
        />
        <Input
          label="Time"
          type="time"
          value={form.scheduledTime}
          onChange={e => setForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Duration (minutes)"
          type="number"
          value={form.duration}
          onChange={e => setForm(prev => ({ ...prev, duration: e.target.value }))}
        />
        <Input
          label="Location / Link"
          value={form.meetingLink || form.location}
          onChange={e => setForm(prev => ({ ...prev, meetingLink: e.target.value }))}
          placeholder="Zoom/Teams link or address"
        />
      </div>
      <Input
        label="Interviewers (comma-separated)"
        value={form.interviewers}
        onChange={e => setForm(prev => ({ ...prev, interviewers: e.target.value }))}
        placeholder="Jane Smith, John Doe"
      />
      <Textarea
        label="Notes"
        value={form.notes}
        onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
        placeholder="Any prep notes or context..."
        rows={3}
      />
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.scheduledDate}>
          Schedule Interview
        </Button>
      </div>
    </div>
  );
}

function InterviewCard({ interview, appId }: { interview: Interview; appId: string }) {
  const db = getPersistence();
  const { loadApplications, addToast } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [prepInput, setPrepInput] = useState('');

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
    rescheduled: 'bg-yellow-100 text-yellow-700',
    no_show: 'bg-gray-100 text-gray-600',
  };

  const markCompleted = () => {
    db.updateInterview(appId, interview.id, { status: 'completed' });
    loadApplications();
    addToast({ type: 'success', message: 'Interview marked as completed' });
  };

  const addPrep = () => {
    if (!prepInput.trim()) return;
    db.addPrepItem(appId, interview.id, prepInput.trim());
    setPrepInput('');
    loadApplications();
  };

  const togglePrep = (prepId: string) => {
    db.togglePrepItem(appId, interview.id, prepId);
    loadApplications();
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center text-sm font-bold">
            {interview.roundNumber}
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900">
              {interview.round.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </p>
            <p className="text-xs text-gray-500">
              {formatDate(interview.scheduledDate, 'MMM d, yyyy')}
              {interview.scheduledTime && ` at ${interview.scheduledTime}`}
              {interview.duration && ` (${interview.duration}min)`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColors[interview.status] || 'bg-gray-100 text-gray-600')}>
            {interview.status}
          </span>
          <svg className={cn('w-4 h-4 text-gray-400 transition-transform', expanded && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">Format:</span> <span className="text-gray-800 capitalize">{interview.format.replace(/_/g, ' ')}</span></div>
            {interview.meetingLink && (
              <div><span className="text-gray-500">Link:</span> <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate">{interview.meetingLink}</a></div>
            )}
            {interview.location && (
              <div><span className="text-gray-500">Location:</span> <span className="text-gray-800">{interview.location}</span></div>
            )}
            {interview.interviewers.length > 0 && (
              <div><span className="text-gray-500">Interviewers:</span> <span className="text-gray-800">{interview.interviewers.join(', ')}</span></div>
            )}
          </div>

          {/* Prep Checklist */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Preparation Checklist</p>
            <div className="space-y-1.5 mb-2">
              {interview.preparation.map(item => (
                <label key={item.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={item.isCompleted}
                    onChange={() => togglePrep(item.id)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className={cn('text-sm', item.isCompleted ? 'line-through text-gray-400' : 'text-gray-700')}>
                    {item.task}
                  </span>
                </label>
              ))}
              {interview.preparation.length === 0 && (
                <p className="text-xs text-gray-400">No prep tasks yet</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={prepInput}
                onChange={e => setPrepInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPrep()}
                placeholder="Add prep task..."
                className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:border-indigo-400"
              />
              <Button size="xs" variant="outline" onClick={addPrep}>Add</Button>
            </div>
          </div>

          {interview.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Notes</p>
              <p className="text-sm text-gray-600">{interview.notes}</p>
            </div>
          )}

          {interview.status === 'scheduled' && (
            <Button size="xs" onClick={markCompleted}>Mark Completed</Button>
          )}
        </div>
      )}
    </div>
  );
}

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { applications, updateApplication, archiveApplication, deleteApplication, addNote, deleteNote, updateApplicationStage, addToast, loadApplications } = useStore();
  const db = getPersistence();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showStageChange, setShowStageChange] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [newTags, setNewTags] = useState<string[] | null>(null);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const allDocuments = db.getAllDocuments();

  const app: Application | null = id
    ? (applications.find(a => a.id === id) || db.getApplicationById(id))
    : null;

  useEffect(() => { loadApplications(); }, []);

  if (!app) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Application not found</p>
          <Button onClick={() => navigate('/board')}>Go to Board</Button>
        </div>
      </div>
    );
  }

  const urgency = getDeadlineUrgency(app.deadline);
  const allTags = [...new Set(applications.flatMap(a => a.tags))];

  const handleStageChange = (stage: PipelineStage) => {
    updateApplicationStage(app.id, stage);
    setShowStageChange(false);
    addToast({ type: 'success', message: `Moved to ${STAGE_LABELS[stage]}` });
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNote(app.id, newNote.trim());
    setNewNote('');
    addToast({ type: 'success', message: 'Note added' });
  };

  const handleUpdateNote = (noteId: string) => {
    if (!editNoteContent.trim()) return;
    const { updateNote } = useStore.getState();
    updateNote(app.id, noteId, editNoteContent.trim());
    setEditingNote(null);
    addToast({ type: 'success', message: 'Note updated' });
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNote(app.id, noteId);
    addToast({ type: 'success', message: 'Note deleted' });
  };

  const handleSaveTags = () => {
    if (newTags !== null) {
      updateApplication(app.id, { tags: newTags });
      setNewTags(null);
      addToast({ type: 'success', message: 'Tags updated' });
    }
  };

  const handleDelete = () => {
    deleteApplication(app.id);
    addToast({ type: 'success', message: 'Application deleted' });
    navigate('/board');
  };

  const handleArchive = () => {
    archiveApplication(app.id);
    addToast({ type: 'info', message: 'Application archived' });
    navigate('/board');
  };

  const handleAttachDoc = (docId: string) => {
    db.attachDocumentToApplication(docId, app.id);
    loadApplications();
    addToast({ type: 'success', message: 'Document attached' });
  };

  const handleDetachDoc = (docId: string) => {
    db.detachDocumentFromApplication(docId, app.id);
    loadApplications();
    addToast({ type: 'success', message: 'Document removed' });
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'interviews', label: 'Interviews', count: app.interviews.length },
    { id: 'documents', label: 'Documents', count: app.documents.length },
    { id: 'notes', label: 'Notes', count: app.notes.length },
    { id: 'timeline', label: 'Timeline' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 mt-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start gap-2 justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900">{app.companyName}</h1>
              <p className="text-base text-gray-600">{app.roleTitle}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link to={`/applications/${app.id}/edit`}>
                <Button variant="outline" size="sm">Edit</Button>
              </Link>
              <button
                onClick={() => setShowArchiveConfirm(true)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Archive"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick info bar */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {/* Stage with click to change */}
            <div className="relative">
              <button
                onClick={() => setShowStageChange(!showStageChange)}
                className="flex items-center gap-1"
              >
                <StageBadge stage={app.stage} />
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showStageChange && (
                <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1 min-w-[200px]">
                  {PIPELINE_STAGES.map(stage => (
                    <button
                      key={stage}
                      onClick={() => handleStageChange(stage)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50',
                        stage === app.stage ? 'font-semibold text-indigo-600' : 'text-gray-700'
                      )}
                    >
                      {STAGE_LABELS[stage]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <PriorityBadge priority={app.priority} />
            <WorkTypeBadge workType={app.workType} />
            {app.location && <span className="text-xs text-gray-500">{app.location}</span>}
          </div>

          {/* Deadline & dates */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
            {app.deadline && (
              <span className={cn(
                'px-2 py-1 rounded font-medium',
                urgency === 'overdue' || urgency === 'critical' ? 'bg-red-50 text-red-600' :
                urgency === 'warning' ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-600'
              )}>
                Deadline: {formatDeadlineLabel(app.deadline)} ({formatDate(app.deadline, 'MMM d')})
              </span>
            )}
            {app.appliedDate && <span className="text-gray-500">Applied: {formatDate(app.appliedDate, 'MMM d')}</span>}
            {app.followUpDate && <span className="text-gray-500">Follow-up: {formatDate(app.followUpDate, 'MMM d')}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn('ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                  activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowInterviewModal(true)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Schedule Interview
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActiveTab('notes')}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Add Note
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDocModalOpen(true)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              Attach Document
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Job info */}
            <Card padding="md">
              <h3 className="font-semibold text-sm text-gray-900 mb-3">Job Details</h3>
              <div className="space-y-2 text-sm">
                {app.jobPostingUrl && (
                  <div className="flex gap-2">
                    <span className="text-gray-500 flex-shrink-0">Posting:</span>
                    <a href={app.jobPostingUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate">
                      View Job Posting
                    </a>
                  </div>
                )}
                {app.source && (
                  <div className="flex gap-2">
                    <span className="text-gray-500">Source:</span>
                    <span className="text-gray-800 capitalize">{app.source.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {app.salary.amount && (
                  <div className="flex gap-2">
                    <span className="text-gray-500">Salary:</span>
                    <span className="text-gray-800">{formatSalary(app.salary.amount, app.salary.period)}</span>
                  </div>
                )}
                {app.salary.notes && (
                  <div className="flex gap-2">
                    <span className="text-gray-500">Notes:</span>
                    <span className="text-gray-800">{app.salary.notes}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Referral */}
            <Card padding="md">
              <h3 className="font-semibold text-sm text-gray-900 mb-3">Referral</h3>
              {app.referralInfo.contactName ? (
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <span className="text-gray-500">Contact:</span>
                    <span className="text-gray-800 font-medium">{app.referralInfo.contactName}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-500">Status:</span>
                    <span className={cn('font-medium', {
                      'text-gray-500': app.referralInfo.status === 'not_asked',
                      'text-yellow-600': app.referralInfo.status === 'asked',
                      'text-blue-600': app.referralInfo.status === 'confirmed',
                      'text-green-600': app.referralInfo.status === 'submitted',
                      'text-red-600': app.referralInfo.status === 'declined',
                    })}>
                      {app.referralInfo.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No referral information</p>
              )}
            </Card>
          </div>

          {/* Tags */}
          <Card padding="md">
            <h3 className="font-semibold text-sm text-gray-900 mb-3">Tags</h3>
            {newTags !== null ? (
              <div>
                <TagInput
                  tags={newTags}
                  onChange={setNewTags}
                  suggestions={allTags}
                />
                <div className="flex gap-2 mt-2">
                  <Button size="xs" onClick={handleSaveTags}>Save</Button>
                  <Button size="xs" variant="outline" onClick={() => setNewTags(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {app.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs">{tag}</span>
                ))}
                <button
                  onClick={() => setNewTags([...app.tags])}
                  className="px-2 py-1 border border-dashed border-gray-300 text-gray-400 rounded text-xs hover:border-gray-400 hover:text-gray-600"
                >
                  + Edit Tags
                </button>
              </div>
            )}
          </Card>

          {/* Job Description */}
          {app.jobDescription && (
            <Card padding="md">
              <h3 className="font-semibold text-sm text-gray-900 mb-3">Job Description</h3>
              <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-60 overflow-y-auto">
                {app.jobDescription}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Interviews Tab */}
      {activeTab === 'interviews' && (
        <div className="space-y-3">
          <Button size="sm" onClick={() => setShowInterviewModal(true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Interview Round
          </Button>
          {app.interviews.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No interviews yet</p>
              <p className="text-xs mt-1">Click above to schedule an interview round</p>
            </div>
          ) : (
            app.interviews.map(interview => (
              <InterviewCard key={interview.id} interview={interview} appId={app.id} />
            ))
          )}
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-3">
          <Button size="sm" variant="outline" onClick={() => setDocModalOpen(true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            Attach Document from Library
          </Button>
          {app.documents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No documents attached</p>
              <p className="text-xs mt-1">Attach resumes, cover letters, and portfolios from your library</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {app.documents.map(doc => (
                <div key={doc.documentId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{doc.documentName}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {doc.type.replace(/_/g, ' ')} v{doc.version}
                      {doc.submittedAt && ` · Submitted ${formatDate(doc.submittedAt, 'MMM d')}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDetachDoc(doc.documentId)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400">
            <Link to="/documents" className="text-indigo-600 hover:underline">Manage document library</Link>
          </p>
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Add a note..."
              rows={3}
            />
            <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>Add Note</Button>
          </div>
          {app.notes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No notes yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {app.notes.map(note => (
                <Card key={note.id} padding="sm">
                  {editingNote === note.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editNoteContent}
                        onChange={e => setEditNoteContent(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button size="xs" onClick={() => handleUpdateNote(note.id)}>Save</Button>
                        <Button size="xs" variant="outline" onClick={() => setEditingNote(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">{formatRelativeDate(note.createdAt)}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingNote(note.id); setEditNoteContent(note.content); }}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-xs text-gray-400 hover:text-red-500"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <div className="space-y-3">
          {app.timeline.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No timeline events</p>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
              <div className="space-y-4">
                {[...app.timeline].reverse().map(event => (
                  <div key={event.id} className="flex items-start gap-3 pl-4">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 border-white shadow-sm flex-shrink-0 -ml-4 z-10',
                      event.type === 'created' ? 'bg-green-100 text-green-700' :
                      event.type === 'stage_changed' ? 'bg-blue-100 text-blue-700' :
                      event.type === 'interview_scheduled' ? 'bg-yellow-100 text-yellow-700' :
                      event.type === 'interview_completed' ? 'bg-green-100 text-green-700' :
                      event.type === 'note_added' ? 'bg-gray-100 text-gray-600' :
                      'bg-indigo-100 text-indigo-700'
                    )}>
                      {event.type === 'created' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                      {event.type === 'stage_changed' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>}
                      {event.type === 'note_added' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" /></svg>}
                      {(event.type === 'interview_scheduled' || event.type === 'interview_completed') && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                      {event.type === 'document_attached' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828" /></svg>}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm text-gray-800">{event.description}</p>
                      {event.fromStage && event.toStage && (
                        <p className="text-xs text-gray-500">{STAGE_LABELS[event.fromStage]} → {STAGE_LABELS[event.toStage]}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">{formatRelativeDate(event.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interview Modal */}
      <Modal
        open={showInterviewModal}
        onClose={() => setShowInterviewModal(false)}
        title="Schedule Interview"
        size="md"
      >
        <InterviewForm
          applicationId={app.id}
          onClose={() => setShowInterviewModal(false)}
          onSave={() => { setShowInterviewModal(false); setActiveTab('interviews'); addToast({ type: 'success', message: 'Interview scheduled' }); }}
        />
      </Modal>

      {/* Document Picker Modal */}
      <Modal
        open={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        title="Attach Document"
        size="md"
      >
        {allDocuments.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500 mb-4">No documents in your library</p>
            <Link to="/documents" onClick={() => setDocModalOpen(false)}>
              <Button size="sm">Go to Document Library</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 mb-3">Select documents to attach to this application</p>
            {allDocuments.map(doc => {
              const attached = app.documents.some(d => d.documentId === doc.id);
              return (
                <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{doc.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{doc.type.replace(/_/g, ' ')} · v{doc.version}</p>
                  </div>
                  <Button
                    size="xs"
                    variant={attached ? 'secondary' : 'primary'}
                    onClick={() => attached ? handleDetachDoc(doc.id) : handleAttachDoc(doc.id)}
                  >
                    {attached ? 'Detach' : 'Attach'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Application"
        message={`Are you sure you want to delete the application to ${app.companyName}? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
      <ConfirmDialog
        open={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={handleArchive}
        title="Archive Application"
        message={`Archive the application to ${app.companyName}? Archived applications are hidden from the board.`}
        confirmLabel="Archive"
      />
    </div>
  );
}
