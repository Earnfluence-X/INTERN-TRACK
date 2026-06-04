import { useState, useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { formatFileSize, formatRelativeDate, cn } from '../lib/utils';
import type { Document, DocumentType } from '../types';

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'resume', label: 'Resume' },
  { value: 'cover_letter', label: 'Cover Letter' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'transcript', label: 'Transcript' },
  { value: 'writing_sample', label: 'Writing Sample' },
  { value: 'other', label: 'Other' },
];

const typeIcons: Record<DocumentType, React.ReactNode> = {
  resume: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  cover_letter: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  portfolio: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  transcript: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  writing_sample: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
  other: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
};

const typeColors: Record<DocumentType, string> = {
  resume: 'text-blue-600 bg-blue-50',
  cover_letter: 'text-green-600 bg-green-50',
  portfolio: 'text-purple-600 bg-purple-50',
  transcript: 'text-yellow-600 bg-yellow-50',
  writing_sample: 'text-orange-600 bg-orange-50',
  other: 'text-gray-600 bg-gray-50',
};

function UploadModal({ open, onClose, onUploaded }: { open: boolean; onClose: () => void; onUploaded: () => void }) {
  const { createDocument, addToast } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: '', type: 'resume' as DocumentType, version: '1.0' });
  const [uploading, setUploading] = useState(false);

  const handleFile = (f: File) => {
    if (f.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', message: 'File too large. Maximum size is 5MB' });
      return;
    }
    setFile(f);
    const nameWithoutExt = f.name.replace(/\.[^.]+$/, '');
    setForm(prev => ({ ...prev, name: prev.name || nameWithoutExt }));
  };

  const handleUpload = async () => {
    if (!file) { addToast({ type: 'error', message: 'Please select a file' }); return; }
    if (!form.name.trim()) { addToast({ type: 'error', message: 'Please enter a name' }); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string) || '';
        createDocument({
          name: form.name.trim(), type: form.type, version: form.version,
          fileData: base64, fileName: file.name, fileSize: file.size,
        });
        addToast({ type: 'success', message: `${form.name} uploaded successfully` });
        setFile(null);
        setForm({ name: '', type: 'resume', version: '1.0' });
        setUploading(false);
        onUploaded();
      };
      reader.readAsDataURL(file);
    } catch {
      addToast({ type: 'error', message: 'Upload failed' });
      setUploading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload Document" size="md">
      <div className="space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => fileRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
          )}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.rtf"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <svg className="w-10 h-10 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {file ? (
            <div>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 font-medium">Drop file here or click to browse</p>
              <p className="text-sm text-gray-400 mt-1">PDF, DOC, DOCX, TXT up to 5MB</p>
            </div>
          )}
        </div>

        <Input label="Document Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Resume v3, Cover Letter - Google" />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Document Type"
            value={form.type}
            onChange={e => setForm(p => ({ ...p, type: e.target.value as DocumentType }))}
            options={DOC_TYPES}
          />
          <Input label="Version" value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} placeholder="1.0" />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleUpload} loading={uploading} disabled={!file}>Upload</Button>
        </div>
      </div>
    </Modal>
  );
}

export function DocumentsPage() {
  const { documents, loadDocuments, deleteDocument, updateDocument, applications, addToast } = useStore();
  const [showUpload, setShowUpload] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<DocumentType | ''>('');
  const [search, setSearch] = useState('');

  useEffect(() => { loadDocuments(); }, []);

  const filtered = documents.filter(d => {
    if (filterType && d.type !== filterType) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by type
  const grouped = DOC_TYPES.reduce((acc, t) => {
    const docs = filtered.filter(d => d.type === t.value);
    if (docs.length > 0) acc[t.value] = docs;
    return acc;
  }, {} as Record<string, Document[]>);

  const getAppNames = (doc: Document) => {
    return doc.usedInApplications
      .map(id => applications.find(a => a.id === id))
      .filter(Boolean)
      .map(a => a!.companyName)
      .join(', ');
  };

  const handleDownload = (doc: Document) => {
    if (!doc.fileData) { addToast({ type: 'error', message: 'No file data available' }); return; }
    const a = document.createElement('a');
    a.href = doc.fileData;
    a.download = doc.fileName || doc.name;
    a.click();
    addToast({ type: 'success', message: `Downloading ${doc.name}` });
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Document Library</h1>
          <p className="text-sm text-gray-500">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={() => setShowUpload(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Upload
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterType('')}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors', !filterType ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            All
          </button>
          {DOC_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value === filterType ? '' : t.value)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors', filterType === t.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">{search ? 'No documents found' : 'No documents yet'}</h3>
          <p className="text-sm text-gray-500 mb-4">{search ? 'Try a different search' : 'Upload your resume, cover letters, and portfolios'}</p>
          {!search && <Button onClick={() => setShowUpload(true)}>Upload First Document</Button>}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, docs]) => {
            const typeInfo = DOC_TYPES.find(t => t.value === type)!;
            return (
              <div key={type}>
                <h2 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
                  <span className={cn('w-6 h-6 rounded flex items-center justify-center', typeColors[type as DocumentType])}>
                    {typeIcons[type as DocumentType]}
                  </span>
                  {typeInfo.label}s
                  <span className="text-gray-400 font-normal">({docs.length})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {docs.map(doc => (
                    <Card key={doc.id} padding="md">
                      <div className="flex items-start gap-3">
                        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', typeColors[doc.type])}>
                          {typeIcons[doc.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{doc.name}</p>
                          <p className="text-xs text-gray-500">
                            v{doc.version} · {doc.fileSize ? formatFileSize(doc.fileSize) : 'No file'}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatRelativeDate(doc.createdAt)}</p>
                        </div>
                      </div>

                      {doc.usedInApplications.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-500">
                            Used in: <span className="text-indigo-600">{getAppNames(doc)}</span>
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={doc.isDefault}
                            onChange={e => updateDocument(doc.id, { isDefault: e.target.checked })}
                            id={`default-${doc.id}`}
                            className="rounded border-gray-300 text-indigo-600"
                          />
                          <label htmlFor={`default-${doc.id}`} className="text-xs text-gray-500">Default</label>
                        </div>
                        <div className="flex-1" />
                        {doc.fileData && (
                          <button
                            onClick={() => handleDownload(doc)}
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            Download
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(doc.id)}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} onUploaded={() => { setShowUpload(false); loadDocuments(); }} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) { deleteDocument(deleteTarget); setDeleteTarget(null); addToast({ type: 'success', message: 'Document deleted' }); } }}
        title="Delete Document"
        message="Are you sure you want to delete this document? It will be removed from all applications."
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
