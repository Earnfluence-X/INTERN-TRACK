import { useState, useRef } from 'react';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/Modal';
import { formatRelativeDate } from '../lib/utils';

export function SettingsPage() {
  const { user, updateUser, updatePreferences, exportData, importData, clearAllData, addToast } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    university: user?.university || '',
    major: user?.major || '',
    graduationDate: user?.graduationDate || '',
  });
  const [prefForm, setPrefForm] = useState({
    weeklyApplicationGoal: user?.preferences?.weeklyApplicationGoal?.toString() || '10',
    defaultFollowUpDays: user?.preferences?.defaultFollowUpDays?.toString() || '7',
    reminderBeforeDeadline: user?.preferences?.reminderBeforeDeadline?.toString() || '24',
    boardView: user?.preferences?.boardView || 'comfortable',
  });
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = () => {
    setSaving(true);
    updateUser({
      fullName: profileForm.fullName,
      email: profileForm.email,
      university: profileForm.university,
      major: profileForm.major,
      graduationDate: profileForm.graduationDate,
    });
    addToast({ type: 'success', message: 'Profile updated' });
    setSaving(false);
  };

  const handleSavePrefs = () => {
    updatePreferences({
      weeklyApplicationGoal: parseInt(prefForm.weeklyApplicationGoal) || 10,
      defaultFollowUpDays: parseInt(prefForm.defaultFollowUpDays) || 7,
      reminderBeforeDeadline: parseInt(prefForm.reminderBeforeDeadline) || 24,
      boardView: prefForm.boardView as 'compact' | 'comfortable' | 'expanded',
    });
    addToast({ type: 'success', message: 'Preferences saved' });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const json = ev.target?.result as string;
      const success = importData(json);
      if (success) {
        addToast({ type: 'success', message: 'Data imported successfully' });
      } else {
        addToast({ type: 'error', message: 'Import failed. Invalid data format.' });
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleClearData = () => {
    clearAllData();
    setShowClearConfirm(false);
    addToast({ type: 'info', message: 'All data cleared. Refresh to restart.' });
    setTimeout(() => window.location.reload(), 1500);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 pb-24 md:pb-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your profile, preferences, and data</p>
      </div>

      {/* Profile */}
      <Card padding="lg" className="mb-4">
        <h2 className="font-semibold text-gray-900 mb-4">Profile Information</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Full Name" value={profileForm.fullName} onChange={e => setProfileForm(p => ({ ...p, fullName: e.target.value }))} />
            <Input label="Email" type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="University" value={profileForm.university} onChange={e => setProfileForm(p => ({ ...p, university: e.target.value }))} />
            <Input label="Major" value={profileForm.major} onChange={e => setProfileForm(p => ({ ...p, major: e.target.value }))} />
          </div>
          <Input label="Expected Graduation" type="month" value={profileForm.graduationDate} onChange={e => setProfileForm(p => ({ ...p, graduationDate: e.target.value }))} />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSaveProfile} loading={saving}>Save Profile</Button>
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card padding="lg" className="mb-4">
        <h2 className="font-semibold text-gray-900 mb-4">Preferences</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Weekly Application Goal"
              value={prefForm.weeklyApplicationGoal}
              onChange={e => setPrefForm(p => ({ ...p, weeklyApplicationGoal: e.target.value }))}
              options={['3','5','10','15','20','25'].map(v => ({ value: v, label: `${v} applications / week` }))}
            />
            <Select
              label="Default Follow-up Days"
              value={prefForm.defaultFollowUpDays}
              onChange={e => setPrefForm(p => ({ ...p, defaultFollowUpDays: e.target.value }))}
              options={['3','5','7','10','14'].map(v => ({ value: v, label: `${v} days` }))}
            />
          </div>
          <Select
            label="Board View Mode"
            value={prefForm.boardView}
            onChange={e => setPrefForm(p => ({ ...p, boardView: e.target.value as 'compact' | 'comfortable' | 'expanded' }))}
            options={[
              { value: 'compact', label: 'Compact - Dense cards, less detail' },
              { value: 'comfortable', label: 'Comfortable - Balanced (recommended)' },
              { value: 'expanded', label: 'Expanded - Full detail cards' },
            ]}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSavePrefs}>Save Preferences</Button>
          </div>
        </div>
      </Card>

      {/* Data Management */}
      <Card padding="lg" className="mb-4">
        <h2 className="font-semibold text-gray-900 mb-4">Data Management</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Export Data</p>
              <p className="text-xs text-gray-500">Download all your applications, contacts, and documents as JSON</p>
            </div>
            <Button size="sm" variant="outline" onClick={exportData}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Import Data</p>
              <p className="text-xs text-gray-500">Import a previously exported InternTrack backup</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
              </svg>
              Import
            </Button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>

          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
            <div>
              <p className="text-sm font-medium text-red-900">Clear All Data</p>
              <p className="text-xs text-red-600">Permanently delete all applications, contacts, and settings</p>
            </div>
            <Button size="sm" variant="danger" onClick={() => setShowClearConfirm(true)}>
              Clear All
            </Button>
          </div>
        </div>
      </Card>

      {/* App Info */}
      <Card padding="lg">
        <h2 className="font-semibold text-gray-900 mb-3">About InternTrack</h2>
        <div className="space-y-1.5 text-sm text-gray-500">
          <p>Version 1.0.0</p>
          <p>All data is stored locally in your browser. No server, no account required.</p>
          <p>Built with React, TypeScript, and Tailwind CSS.</p>
          {user?.createdAt && (
            <p>Account created {formatRelativeDate(user.createdAt)}</p>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearData}
        title="Clear All Data"
        message="This will permanently delete ALL your applications, contacts, documents, and settings. This cannot be undone. Are you sure?"
        confirmLabel="Yes, Clear Everything"
        confirmVariant="danger"
      />
    </div>
  );
}
