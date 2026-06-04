import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import { getPersistence } from '../lib/persistence';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { TagInput } from '../components/ui/TagInput';
import type { Application, PipelineStage, WorkType, Priority } from '../types';
import { PIPELINE_STAGES, STAGE_LABELS } from '../types';

interface FormData {
  companyName: string;
  roleTitle: string;
  location: string;
  workType: WorkType;
  jobPostingUrl: string;
  jobDescription: string;
  stage: PipelineStage;
  priority: Priority;
  deadline: string;
  appliedDate: string;
  source: string;
  salaryAmount: string;
  salaryPeriod: string;
  salaryNotes: string;
  tags: string[];
  referralContactName: string;
  referralStatus: string;
  notes: string;
}

const defaultForm: FormData = {
  companyName: '', roleTitle: '', location: '', workType: 'unspecified',
  jobPostingUrl: '', jobDescription: '', stage: 'wishlist', priority: 'medium',
  deadline: '', appliedDate: '', source: '', salaryAmount: '', salaryPeriod: 'unspecified',
  salaryNotes: '', tags: [], referralContactName: '', referralStatus: 'not_asked', notes: '',
};

interface Props {
  editId?: string;
}

export function ApplicationFormPage({ editId }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createApplication, updateApplication, applications, addToast } = useStore();
  const db = getPersistence();
  const [form, setForm] = useState<FormData>({ ...defaultForm });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState(1);

  const isEdit = !!editId;
  const existingApp = isEdit ? applications.find(a => a.id === editId) || db.getApplicationById(editId) : null;

  // Existing tags from all apps
  const allTags = [...new Set(applications.flatMap(a => a.tags))];

  useEffect(() => {
    const stageParam = searchParams.get('stage') as PipelineStage | null;
    if (stageParam && PIPELINE_STAGES.includes(stageParam)) {
      setForm(prev => ({ ...prev, stage: stageParam }));
    }
    if (isEdit && existingApp) {
      setForm({
        companyName: existingApp.companyName,
        roleTitle: existingApp.roleTitle,
        location: existingApp.location,
        workType: existingApp.workType,
        jobPostingUrl: existingApp.jobPostingUrl,
        jobDescription: existingApp.jobDescription,
        stage: existingApp.stage,
        priority: existingApp.priority,
        deadline: existingApp.deadline || '',
        appliedDate: existingApp.appliedDate || '',
        source: existingApp.source,
        salaryAmount: existingApp.salary.amount?.toString() || '',
        salaryPeriod: existingApp.salary.period,
        salaryNotes: existingApp.salary.notes,
        tags: existingApp.tags,
        referralContactName: existingApp.referralInfo.contactName,
        referralStatus: existingApp.referralInfo.status,
        notes: existingApp.notes.length > 0 ? existingApp.notes[0].content : '',
      });
    }
  }, [editId, existingApp]);

  const update = (key: keyof FormData, value: string | string[]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!form.roleTitle.trim()) newErrors.roleTitle = 'Role title is required';
    if (form.jobPostingUrl && !form.jobPostingUrl.startsWith('http')) {
      newErrors.jobPostingUrl = 'URL must start with http:// or https://';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (addAnother = false) => {
    if (!validate()) { setSection(1); return; }
    setSaving(true);
    const appData: Partial<Application> = {
      companyName: form.companyName.trim(),
      roleTitle: form.roleTitle.trim(),
      location: form.location.trim(),
      workType: form.workType,
      jobPostingUrl: form.jobPostingUrl.trim(),
      jobDescription: form.jobDescription.trim(),
      stage: form.stage,
      priority: form.priority,
      deadline: form.deadline || null,
      appliedDate: form.appliedDate || null,
      source: form.source,
      salary: {
        amount: form.salaryAmount ? parseFloat(form.salaryAmount) : null,
        period: form.salaryPeriod as Application['salary']['period'],
        notes: form.salaryNotes,
      },
      tags: form.tags,
      referralInfo: {
        contactId: null,
        contactName: form.referralContactName,
        status: form.referralStatus as Application['referralInfo']['status'],
      },
    };

    if (isEdit && editId) {
      updateApplication(editId, appData);
      if (form.notes && existingApp?.notes.length === 0) {
        // add note
        db.addNote(editId, form.notes);
      }
      addToast({ type: 'success', message: 'Application updated successfully' });
      navigate(`/applications/${editId}`);
    } else {
      const id = createApplication(appData);
      if (form.notes) db.addNote(id, form.notes);
      addToast({ type: 'success', message: `Application to ${form.companyName} added` });
      if (addAnother) {
        setForm({ ...defaultForm });
        setSection(1);
      } else {
        navigate(`/applications/${id}`);
      }
    }
    setSaving(false);
  };

  const sections = [
    { label: 'Basic Info', icon: '1' },
    { label: 'Details', icon: '2' },
    { label: 'Notes', icon: '3' },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Edit Application' : 'New Application'}
          </h1>
          <p className="text-sm text-gray-500">
            {isEdit ? `Editing ${existingApp?.companyName}` : 'Track a new internship opportunity'}
          </p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {sections.map((s, i) => (
          <button
            key={s.label}
            onClick={() => setSection(i + 1)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              section === i + 1 ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Section 1: Basic Info */}
      {section === 1 && (
        <div className="space-y-4">
          <Input
            label="Company Name *"
            value={form.companyName}
            onChange={e => update('companyName', e.target.value)}
            placeholder="e.g., Google, Stripe, Airbnb"
            error={errors.companyName}
            autoFocus
          />
          <Input
            label="Role Title *"
            value={form.roleTitle}
            onChange={e => update('roleTitle', e.target.value)}
            placeholder="e.g., Software Engineering Intern"
            error={errors.roleTitle}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Location"
              value={form.location}
              onChange={e => update('location', e.target.value)}
              placeholder="San Francisco, CA"
            />
            <Select
              label="Work Type"
              value={form.workType}
              onChange={e => update('workType', e.target.value)}
              options={[
                { value: 'unspecified', label: 'Unspecified' },
                { value: 'remote', label: 'Remote' },
                { value: 'hybrid', label: 'Hybrid' },
                { value: 'onsite', label: 'Onsite' },
              ]}
            />
          </div>
          <Input
            label="Job Posting URL"
            type="url"
            value={form.jobPostingUrl}
            onChange={e => update('jobPostingUrl', e.target.value)}
            placeholder="https://company.com/jobs/12345"
            error={errors.jobPostingUrl}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Pipeline Stage"
              value={form.stage}
              onChange={e => update('stage', e.target.value)}
              options={PIPELINE_STAGES.map(s => ({ value: s, label: STAGE_LABELS[s] }))}
            />
            <Select
              label="Priority"
              value={form.priority}
              onChange={e => update('priority', e.target.value)}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Application Deadline"
              type="date"
              value={form.deadline}
              onChange={e => update('deadline', e.target.value)}
            />
            <Input
              label="Applied Date"
              type="date"
              value={form.appliedDate}
              onChange={e => update('appliedDate', e.target.value)}
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setSection(2)}>Next: Details</Button>
          </div>
        </div>
      )}

      {/* Section 2: Details */}
      {section === 2 && (
        <div className="space-y-4">
          <Select
            label="Source"
            value={form.source}
            onChange={e => update('source', e.target.value)}
            placeholder="Where did you find this?"
            options={[
              { value: 'linkedin', label: 'LinkedIn' },
              { value: 'handshake', label: 'Handshake' },
              { value: 'company_website', label: 'Company Website' },
              { value: 'career_fair', label: 'Career Fair' },
              { value: 'referral', label: 'Referral' },
              { value: 'indeed', label: 'Indeed' },
              { value: 'glassdoor', label: 'Glassdoor' },
              { value: 'other', label: 'Other' },
            ]}
          />

          {/* Salary */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Compensation</label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={form.salaryAmount}
                onChange={e => update('salaryAmount', e.target.value)}
                placeholder="Amount (e.g., 45)"
                type="number"
              />
              <Select
                value={form.salaryPeriod}
                onChange={e => update('salaryPeriod', e.target.value)}
                options={[
                  { value: 'unspecified', label: 'Not specified' },
                  { value: 'hourly', label: 'Per hour' },
                  { value: 'monthly', label: 'Per month' },
                  { value: 'yearly', label: 'Per year' },
                ]}
              />
            </div>
            <Input
              value={form.salaryNotes}
              onChange={e => update('salaryNotes', e.target.value)}
              placeholder="e.g., + housing stipend, relocation covered"
            />
          </div>

          {/* Referral */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Referral</label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={form.referralContactName}
                onChange={e => update('referralContactName', e.target.value)}
                placeholder="Referral contact name"
              />
              <Select
                value={form.referralStatus}
                onChange={e => update('referralStatus', e.target.value)}
                options={[
                  { value: 'not_asked', label: 'Not asked' },
                  { value: 'asked', label: 'Asked' },
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'submitted', label: 'Submitted' },
                  { value: 'declined', label: 'Declined' },
                ]}
              />
            </div>
          </div>

          {/* Tags */}
          <TagInput
            label="Tags"
            tags={form.tags}
            onChange={tags => update('tags', tags)}
            suggestions={allTags}
            placeholder="Add tags (e.g., fintech, golang, remote)"
          />

          {/* Job description */}
          <Textarea
            label="Job Description"
            value={form.jobDescription}
            onChange={e => update('jobDescription', e.target.value)}
            placeholder="Paste the job description here..."
            rows={6}
            hint="Useful for referencing requirements later"
          />

          <div className="flex gap-3 justify-between pt-2">
            <Button variant="outline" onClick={() => setSection(1)}>Back</Button>
            <Button onClick={() => setSection(3)}>Next: Notes</Button>
          </div>
        </div>
      )}

      {/* Section 3: Notes */}
      {section === 3 && (
        <div className="space-y-4">
          <Textarea
            label="Initial Notes"
            value={form.notes}
            onChange={e => update('notes', e.target.value)}
            placeholder="Add any initial notes about this application..."
            rows={6}
          />

          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
            <h3 className="text-sm font-semibold text-indigo-900 mb-2">Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-indigo-700">
              <div><span className="text-indigo-500">Company:</span> {form.companyName || '—'}</div>
              <div><span className="text-indigo-500">Role:</span> {form.roleTitle || '—'}</div>
              <div><span className="text-indigo-500">Stage:</span> {STAGE_LABELS[form.stage]}</div>
              <div><span className="text-indigo-500">Priority:</span> {form.priority}</div>
              {form.deadline && <div><span className="text-indigo-500">Deadline:</span> {form.deadline}</div>}
              {form.tags.length > 0 && <div><span className="text-indigo-500">Tags:</span> {form.tags.join(', ')}</div>}
            </div>
          </div>

          <div className="flex gap-3 justify-between pt-2">
            <Button variant="outline" onClick={() => setSection(2)}>Back</Button>
            <div className="flex gap-3">
              {!isEdit && (
                <Button variant="outline" onClick={() => handleSubmit(true)} loading={saving}>
                  Save & Add Another
                </Button>
              )}
              <Button onClick={() => handleSubmit(false)} loading={saving}>
                {isEdit ? 'Save Changes' : 'Save Application'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
