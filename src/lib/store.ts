import { create } from 'zustand';
import { getPersistence } from './persistence';
import type {
  User, Application, Contact, Document, Reminder,
  PipelineStage, UserPreferences, Notification,
} from '../types';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface AppState {
  // Auth/User
  user: User | null;
  isOnboarded: boolean;

  // Data
  applications: Application[];
  contacts: Contact[];
  documents: Document[];
  reminders: Reminder[];
  notifications: Notification[];

  // UI State
  toasts: Toast[];
  commandPaletteOpen: boolean;
  searchQuery: string;

  // Board state
  boardFilters: {
    search: string;
    priority: string;
    tags: string[];
  };

  // Actions - User
  initUser: (data: Partial<User>) => void;
  updateUser: (updates: Partial<User>) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  loadUser: () => void;

  // Actions - Applications
  loadApplications: () => void;
  createApplication: (data: Partial<Application>) => string;
  updateApplication: (id: string, updates: Partial<Application>) => void;
  updateApplicationStage: (id: string, stage: PipelineStage) => void;
  archiveApplication: (id: string) => void;
  deleteApplication: (id: string) => void;
  addNote: (appId: string, content: string, tags?: string[]) => string;
  updateNote: (appId: string, noteId: string, content: string) => void;
  deleteNote: (appId: string, noteId: string) => void;

  // Actions - Contacts
  loadContacts: () => void;
  createContact: (data: Partial<Contact>) => string;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  addInteraction: (contactId: string, data: Record<string, unknown>) => string;

  // Actions - Documents
  loadDocuments: () => void;
  createDocument: (data: Partial<Document>) => string;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  attachDocument: (docId: string, appId: string) => void;
  detachDocument: (docId: string, appId: string) => void;

  // Actions - Reminders
  loadReminders: () => void;
  completeReminder: (id: string) => void;
  snoozeReminder: (id: string, until: string) => void;

  // Actions - Notifications
  loadNotifications: () => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Actions - UI
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSearchQuery: (q: string) => void;
  setBoardFilters: (filters: Partial<AppState['boardFilters']>) => void;

  // Actions - Data management
  exportData: () => void;
  importData: (json: string) => boolean;
  clearAllData: () => void;

  // Refresh all data
  refreshAll: () => void;
}

const db = getPersistence();

export const useStore = create<AppState>((set, get) => ({
  user: null,
  isOnboarded: false,
  applications: [],
  contacts: [],
  documents: [],
  reminders: [],
  notifications: [],
  toasts: [],
  commandPaletteOpen: false,
  searchQuery: '',
  boardFilters: { search: '', priority: '', tags: [] },

  // USER
  initUser: (data) => {
    const user = db.initializeUser(data);
    set({ user, isOnboarded: true });
  },

  updateUser: (updates) => {
    db.updateUser(updates);
    set({ user: db.getUser() });
  },

  updatePreferences: (prefs) => {
    db.updatePreferences(prefs);
    set({ user: db.getUser() });
  },

  loadUser: () => {
    const user = db.getUser();
    set({ user, isOnboarded: !!user });
  },

  // APPLICATIONS
  loadApplications: () => {
    set({ applications: db.getAllApplications() });
  },

  createApplication: (data) => {
    const id = db.createApplication(data);
    set({ applications: db.getAllApplications(), user: db.getUser() });
    return id;
  },

  updateApplication: (id, updates) => {
    db.updateApplication(id, updates);
    set({ applications: db.getAllApplications(), user: db.getUser() });
  },

  updateApplicationStage: (id, stage) => {
    db.updateApplicationStage(id, stage);
    set({ applications: db.getAllApplications(), user: db.getUser() });
  },

  archiveApplication: (id) => {
    db.archiveApplication(id);
    set({ applications: db.getAllApplications(), user: db.getUser() });
  },

  deleteApplication: (id) => {
    db.deleteApplication(id);
    set({ applications: db.getAllApplications(), user: db.getUser() });
  },

  addNote: (appId, content, tags = []) => {
    const id = db.addNote(appId, content, tags);
    set({ applications: db.getAllApplications() });
    return id;
  },

  updateNote: (appId, noteId, content) => {
    db.updateNote(appId, noteId, content);
    set({ applications: db.getAllApplications() });
  },

  deleteNote: (appId, noteId) => {
    db.deleteNote(appId, noteId);
    set({ applications: db.getAllApplications() });
  },

  // CONTACTS
  loadContacts: () => {
    set({ contacts: db.getAllContacts() });
  },

  createContact: (data) => {
    const id = db.createContact(data);
    set({ contacts: db.getAllContacts() });
    return id;
  },

  updateContact: (id, updates) => {
    db.updateContact(id, updates);
    set({ contacts: db.getAllContacts() });
  },

  deleteContact: (id) => {
    db.deleteContact(id);
    set({ contacts: db.getAllContacts() });
  },

  addInteraction: (contactId, data) => {
    const id = db.addInteraction(contactId, data as Parameters<typeof db.addInteraction>[1]);
    set({ contacts: db.getAllContacts() });
    return id;
  },

  // DOCUMENTS
  loadDocuments: () => {
    set({ documents: db.getAllDocuments() });
  },

  createDocument: (data) => {
    const id = db.createDocument(data);
    set({ documents: db.getAllDocuments() });
    return id;
  },

  updateDocument: (id, updates) => {
    db.updateDocument(id, updates);
    set({ documents: db.getAllDocuments() });
  },

  deleteDocument: (id) => {
    db.deleteDocument(id);
    set({ documents: db.getAllDocuments() });
  },

  attachDocument: (docId, appId) => {
    db.attachDocumentToApplication(docId, appId);
    set({ applications: db.getAllApplications(), documents: db.getAllDocuments() });
  },

  detachDocument: (docId, appId) => {
    db.detachDocumentFromApplication(docId, appId);
    set({ applications: db.getAllApplications(), documents: db.getAllDocuments() });
  },

  // REMINDERS
  loadReminders: () => {
    set({ reminders: db.getAllReminders() });
  },

  completeReminder: (id) => {
    db.completeReminder(id);
    set({ reminders: db.getAllReminders() });
  },

  snoozeReminder: (id, until) => {
    db.snoozeReminder(id, until);
    set({ reminders: db.getAllReminders() });
  },

  // NOTIFICATIONS
  loadNotifications: () => {
    set({ notifications: db.getNotifications() });
  },

  markNotificationRead: (id) => {
    db.markNotificationRead(id);
    set({ notifications: db.getNotifications() });
  },

  markAllNotificationsRead: () => {
    db.markAllNotificationsRead();
    set({ notifications: db.getNotifications() });
  },

  // UI
  addToast: (toast) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const newToast: Toast = { ...toast, id };
    set(state => ({ toasts: [...state.toasts, newToast] }));
    const duration = toast.duration || 4000;
    setTimeout(() => get().removeToast(id), duration);
  },

  removeToast: (id) => {
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
  },

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setBoardFilters: (filters) => set(state => ({ boardFilters: { ...state.boardFilters, ...filters } })),

  // DATA MANAGEMENT
  exportData: () => {
    const data = db.exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interntrack-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importData: (json) => {
    const success = db.importData(json);
    if (success) get().refreshAll();
    return success;
  },

  clearAllData: () => {
    db.clearAllData();
    set({
      user: null, isOnboarded: false,
      applications: [], contacts: [], documents: [],
      reminders: [], notifications: [],
    });
  },

  refreshAll: () => {
    set({
      user: db.getUser(),
      isOnboarded: !!db.getUser(),
      applications: db.getAllApplications(),
      contacts: db.getAllContacts(),
      documents: db.getAllDocuments(),
      reminders: db.getAllReminders(),
      notifications: db.getNotifications(),
    });
  },
}));
