import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { getPersistence } from '../lib/persistence';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { formatRelativeDate, formatDate, generateInitials, cn } from '../lib/utils';
import type { Contact, ContactRole, InteractionType } from '../types';

function ContactForm({ contact, onClose, onSave }: { contact?: Contact; onClose: () => void; onSave: (id: string) => void }) {
  const { createContact, updateContact } = useStore();
  const [form, setForm] = useState({
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    company: contact?.company || '',
    role: contact?.role || '',
    contactRole: (contact?.contactRole || 'other') as ContactRole,
    linkedinUrl: contact?.linkedinUrl || '',
    notes: contact?.notes || '',
    relationshipStrength: (contact?.relationshipStrength || 3) as 1|2|3|4|5,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    if (!form.firstName.trim()) return;
    setSaving(true);
    if (contact) {
      updateContact(contact.id, { ...form, relationshipStrength: form.relationshipStrength as 1|2|3|4|5 });
      onSave(contact.id);
    } else {
      const id = createContact({ ...form, relationshipStrength: form.relationshipStrength as 1|2|3|4|5 });
      onSave(id);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="First Name *" value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} placeholder="Jane" />
        <Input label="Last Name" value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} placeholder="Smith" />
      </div>
      <Input label="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="jane@company.com" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
        <Select
          label="Contact Role"
          value={form.contactRole}
          onChange={e => setForm(p => ({ ...p, contactRole: e.target.value as ContactRole }))}
          options={[
            { value: 'recruiter', label: 'Recruiter' },
            { value: 'hiring_manager', label: 'Hiring Manager' },
            { value: 'referral', label: 'Referral' },
            { value: 'alumni', label: 'Alumni' },
            { value: 'peer', label: 'Peer' },
            { value: 'professor', label: 'Professor' },
            { value: 'other', label: 'Other' },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Company" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="Google" />
        <Input label="Title / Role" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} placeholder="Senior Recruiter" />
      </div>
      <Input label="LinkedIn URL" value={form.linkedinUrl} onChange={e => setForm(p => ({ ...p, linkedinUrl: e.target.value }))} placeholder="https://linkedin.com/in/..." />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Relationship Strength</label>
        <div className="flex gap-1">
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setForm(p => ({ ...p, relationshipStrength: n as 1|2|3|4|5 }))}
              className={cn('w-8 h-8 rounded border-2 text-sm font-bold transition-colors',
                n <= form.relationshipStrength ? 'bg-indigo-100 border-indigo-400 text-indigo-700' : 'border-gray-200 text-gray-300 hover:border-gray-300'
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <Textarea label="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any notes about this contact..." rows={3} />
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.firstName.trim()}>
          {contact ? 'Update Contact' : 'Add Contact'}
        </Button>
      </div>
    </div>
  );
}

function InteractionForm({ contactId, onClose, onSave }: { contactId: string; onClose: () => void; onSave: () => void }) {
  const { addInteraction, applications } = useStore();
  const [form, setForm] = useState({
    type: 'email' as InteractionType,
    date: new Date().toISOString().split('T')[0],
    notes: '',
    outcome: '',
    applicationId: '',
    followUpNeeded: false,
    followUpDate: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    addInteraction(contactId, { ...form, applicationId: form.applicationId || null, followUpDate: form.followUpDate || null });
    setSaving(false);
    onSave();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Interaction Type"
          value={form.type}
          onChange={e => setForm(p => ({ ...p, type: e.target.value as InteractionType }))}
          options={[
            { value: 'email', label: 'Email' },
            { value: 'call', label: 'Phone Call' },
            { value: 'coffee_chat', label: 'Coffee Chat' },
            { value: 'linkedin', label: 'LinkedIn' },
            { value: 'career_fair', label: 'Career Fair' },
            { value: 'info_session', label: 'Info Session' },
            { value: 'interview', label: 'Interview' },
            { value: 'other', label: 'Other' },
          ]}
        />
        <Input label="Date" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
      </div>
      <Select
        label="Related Application (optional)"
        value={form.applicationId}
        onChange={e => setForm(p => ({ ...p, applicationId: e.target.value }))}
        options={applications.map(a => ({ value: a.id, label: `${a.companyName} - ${a.roleTitle}` }))}
        placeholder="None"
      />
      <Textarea label="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="What happened?" rows={3} />
      <Input label="Outcome" value={form.outcome} onChange={e => setForm(p => ({ ...p, outcome: e.target.value }))} placeholder="e.g., Scheduled next steps, No response needed" />
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="followUpNeeded"
          checked={form.followUpNeeded}
          onChange={e => setForm(p => ({ ...p, followUpNeeded: e.target.checked }))}
          className="rounded border-gray-300 text-indigo-600"
        />
        <label htmlFor="followUpNeeded" className="text-sm text-gray-700">Follow-up needed</label>
      </div>
      {form.followUpNeeded && (
        <Input label="Follow-up Date" type="date" value={form.followUpDate} onChange={e => setForm(p => ({ ...p, followUpDate: e.target.value }))} />
      )}
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleSave} loading={saving}>Log Interaction</Button>
      </div>
    </div>
  );
}

function ContactAvatar({ contact, size = 'md' }: { contact: Contact; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
  const colors = [
    'bg-red-100 text-red-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700', 'bg-yellow-100 text-yellow-700', 'bg-pink-100 text-pink-700',
  ];
  const colorIndex = (contact.firstName.charCodeAt(0) + (contact.lastName.charCodeAt(0) || 0)) % colors.length;
  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold flex-shrink-0', sizeClasses[size], colors[colorIndex])}>
      {generateInitials(`${contact.firstName} ${contact.lastName}`)}
    </div>
  );
}

export function ContactsPage() {
  const { contacts, loadContacts, deleteContact, addToast } = useStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => { loadContacts(); }, []);

  const filtered = contacts
    .filter(c => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (c.firstName + ' ' + c.lastName).toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) || c.role.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.firstName.localeCompare(b.firstName);
      if (sortBy === 'company') return a.company.localeCompare(b.company);
      if (sortBy === 'strength') return b.relationshipStrength - a.relationshipStrength;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const roleColors: Record<string, string> = {
    recruiter: 'bg-blue-100 text-blue-700',
    hiring_manager: 'bg-purple-100 text-purple-700',
    referral: 'bg-green-100 text-green-700',
    alumni: 'bg-yellow-100 text-yellow-700',
    peer: 'bg-gray-100 text-gray-600',
    professor: 'bg-indigo-100 text-indigo-700',
    other: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500">{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Contact
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </div>
        <Select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          options={[
            { value: 'updatedAt', label: 'Sort: Recent' },
            { value: 'name', label: 'Sort: Name' },
            { value: 'company', label: 'Sort: Company' },
            { value: 'strength', label: 'Sort: Relationship' },
          ]}
          className="w-40"
        />
      </div>

      {/* Contact grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">{search ? 'No contacts found' : 'No contacts yet'}</h3>
          <p className="text-sm text-gray-500 mb-4">
            {search ? 'Try a different search' : 'Add recruiters, referrals, and networking contacts'}
          </p>
          {!search && <Button onClick={() => setShowForm(true)}>Add First Contact</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(contact => (
            <div
              key={contact.id}
              onClick={() => navigate(`/contacts/${contact.id}`)}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <ContactAvatar contact={contact} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{contact.firstName} {contact.lastName}</p>
                  <p className="text-xs text-gray-500 truncate">{contact.role}{contact.company ? ` at ${contact.company}` : ''}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={cn('text-xs px-1.5 py-0.5 rounded capitalize', roleColors[contact.contactRole] || 'bg-gray-100 text-gray-600')}>
                    {contact.contactRole.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(n => (
                    <div key={n} className={cn('w-2.5 h-2.5 rounded-sm', n <= contact.relationshipStrength ? 'bg-indigo-400' : 'bg-gray-100')} />
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  {contact.lastContactedAt ? `Contacted ${formatRelativeDate(contact.lastContactedAt)}` : 'Never contacted'}
                </p>
              </div>
              {contact.nextFollowUpDate && (
                <p className="text-xs text-orange-600 mt-1">Follow-up: {formatDate(contact.nextFollowUpDate, 'MMM d')}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={e => { e.stopPropagation(); setDeleteTarget(contact.id); }}
                  className="ml-auto text-gray-300 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Contact" size="md">
        <ContactForm onClose={() => setShowForm(false)} onSave={id => { setShowForm(false); navigate(`/contacts/${id}`); addToast({ type: 'success', message: 'Contact added' }); }} />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) { deleteContact(deleteTarget); setDeleteTarget(null); addToast({ type: 'success', message: 'Contact deleted' }); } }}
        title="Delete Contact"
        message="Are you sure you want to delete this contact?"
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contacts, loadContacts, deleteContact, addToast } = useStore();
  const [showEdit, setShowEdit] = useState(false);
  const [showInteraction, setShowInteraction] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => { loadContacts(); }, []);

  const contact = id ? contacts.find(c => c.id === id) || getPersistence().getContactById(id) : null;

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Contact not found</p>
          <Button onClick={() => navigate('/contacts')}>Back to Contacts</Button>
        </div>
      </div>
    );
  }

  const typeLabel: Record<string, string> = {
    email: 'Email', call: 'Call', coffee_chat: 'Coffee Chat', linkedin: 'LinkedIn',
    career_fair: 'Career Fair', info_session: 'Info Session', interview: 'Interview', other: 'Other',
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/contacts')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 flex items-center gap-4">
          <div className={cn('w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0',
            'bg-indigo-100 text-indigo-700'
          )}>
            {generateInitials(`${contact.firstName} ${contact.lastName}`)}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{contact.firstName} {contact.lastName}</h1>
            <p className="text-sm text-gray-500">{contact.role}{contact.company ? ` at ${contact.company}` : ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}>Edit</Button>
          <button onClick={() => setShowDelete(true)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card padding="md">
          <h3 className="font-semibold text-sm text-gray-900 mb-3">Contact Info</h3>
          <div className="space-y-2 text-sm">
            {contact.email && <div className="flex gap-2"><span className="text-gray-500">Email:</span><a href={`mailto:${contact.email}`} className="text-indigo-600 hover:underline">{contact.email}</a></div>}
            {contact.phone && <div className="flex gap-2"><span className="text-gray-500">Phone:</span><span>{contact.phone}</span></div>}
            {contact.linkedinUrl && <div className="flex gap-2"><span className="text-gray-500">LinkedIn:</span><a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate">View Profile</a></div>}
            <div className="flex gap-2 items-center">
              <span className="text-gray-500">Strength:</span>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(n => (
                  <div key={n} className={cn('w-3 h-3 rounded-sm', n <= contact.relationshipStrength ? 'bg-indigo-400' : 'bg-gray-100')} />
                ))}
              </div>
            </div>
            {contact.lastContactedAt && <div className="flex gap-2"><span className="text-gray-500">Last contact:</span><span>{formatRelativeDate(contact.lastContactedAt)}</span></div>}
            {contact.nextFollowUpDate && <div className="flex gap-2"><span className="text-gray-500">Follow-up:</span><span className="text-orange-600">{formatDate(contact.nextFollowUpDate, 'MMM d, yyyy')}</span></div>}
          </div>
        </Card>

        {contact.notes && (
          <Card padding="md">
            <h3 className="font-semibold text-sm text-gray-900 mb-3">Notes</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{contact.notes}</p>
          </Card>
        )}
      </div>

      {/* Interactions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Interaction History</h2>
          <Button size="sm" onClick={() => setShowInteraction(true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Log Interaction
          </Button>
        </div>
        {contact.interactions.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No interactions logged yet</p>
        ) : (
          <div className="space-y-3">
            {contact.interactions.map(interaction => (
              <Card key={interaction.id} padding="sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">
                    {typeLabel[interaction.type]?.charAt(0) || 'O'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">{typeLabel[interaction.type]}</span>
                      <span className="text-xs text-gray-400">{formatDate(interaction.date, 'MMM d, yyyy')}</span>
                    </div>
                    {interaction.notes && <p className="text-sm text-gray-600 mt-1">{interaction.notes}</p>}
                    {interaction.outcome && <p className="text-xs text-gray-500 mt-1">Outcome: {interaction.outcome}</p>}
                    {interaction.followUpDate && (
                      <p className="text-xs text-orange-600 mt-1">Follow-up: {formatDate(interaction.followUpDate, 'MMM d')}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Contact" size="md">
        <ContactForm
          contact={contact}
          onClose={() => setShowEdit(false)}
          onSave={() => { setShowEdit(false); loadContacts(); addToast({ type: 'success', message: 'Contact updated' }); }}
        />
      </Modal>

      <Modal open={showInteraction} onClose={() => setShowInteraction(false)} title="Log Interaction" size="md">
        <InteractionForm
          contactId={contact.id}
          onClose={() => setShowInteraction(false)}
          onSave={() => { setShowInteraction(false); loadContacts(); addToast({ type: 'success', message: 'Interaction logged' }); }}
        />
      </Modal>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => { deleteContact(contact.id); addToast({ type: 'success', message: 'Contact deleted' }); navigate('/contacts'); }}
        title="Delete Contact"
        message={`Delete ${contact.firstName} ${contact.lastName}? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
