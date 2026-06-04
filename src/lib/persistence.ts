import type {
  User, Application, Contact, Document, Reminder, DailyLog,
  Notification, UserPreferences, UserStats, PipelineStage,
  ApplicationNote, Interview, InterviewRound, Interaction,
  TimelineEvent, InterviewQuestion, DocumentType, ContactRole,
} from '../types';

const DB_NAME = 'interntrack_db';
const DB_VERSION = '1.0';

interface InternTrackDB {
  version: string;
  user: User | null;
  applications: Record<string, Application>;
  contacts: Record<string, Contact>;
  documents: Record<string, Document>;
  reminders: Record<string, Reminder>;
  dailyLogs: DailyLog[];
  notifications: Notification[];
  settings: UserPreferences;
  questionBank: InterviewQuestion[];
}

const getEmptyDB = (): InternTrackDB => ({
  version: DB_VERSION,
  user: null,
  applications: {},
  contacts: {},
  documents: {},
  reminders: {},
  dailyLogs: [],
  notifications: [],
  settings: {
    defaultFollowUpDays: 7,
    reminderBeforeDeadline: 24,
    weeklyApplicationGoal: 10,
    colorScheme: 'light',
    boardView: 'comfortable',
  },
  questionBank: [],
});

const getEmptyStats = (): UserStats => ({
  totalApplications: 0, activeApplications: 0, interviewsScheduled: 0,
  interviewsCompleted: 0, offersReceived: 0, offersAccepted: 0,
  responseRate: 0, interviewRate: 0, offerRate: 0,
  averageResponseTime: 0, currentStreak: 0, longestStreak: 0,
  weeklyApplications: 0,
});

const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

class InternTrackPersistence {
  private db: InternTrackDB;

  constructor() {
    this.db = this.loadDatabase();
    this.initializeStructure();
  }

  private loadDatabase(): InternTrackDB {
    try {
      const stored = localStorage.getItem(DB_NAME);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...getEmptyDB(), ...parsed };
      }
    } catch {
      // corrupted, reset
    }
    return getEmptyDB();
  }

  private initializeStructure(): void {
    this.db.applications = this.db.applications || {};
    this.db.contacts = this.db.contacts || {};
    this.db.documents = this.db.documents || {};
    this.db.reminders = this.db.reminders || {};
    this.db.dailyLogs = this.db.dailyLogs || [];
    this.db.notifications = this.db.notifications || [];
    this.db.settings = this.db.settings || getEmptyDB().settings;
    this.db.questionBank = this.db.questionBank || [];
  }

  save(): void {
    try {
      localStorage.setItem(DB_NAME, JSON.stringify(this.db));
    } catch (e) {
      console.error('Failed to save:', e);
    }
  }

  // USER
  initializeUser(data: Partial<User>): User {
    const user: User = {
      id: generateId(),
      email: data.email || '',
      fullName: data.fullName || '',
      university: data.university || '',
      major: data.major || '',
      graduationDate: data.graduationDate || '',
      targetIndustries: data.targetIndustries || [],
      targetRoles: data.targetRoles || [],
      preferences: this.db.settings,
      stats: getEmptyStats(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.db.user = user;
    this.save();
    return user;
  }

  getUser(): User | null { return this.db.user; }

  updateUser(updates: Partial<User>): void {
    if (this.db.user) {
      this.db.user = { ...this.db.user, ...updates, updatedAt: new Date().toISOString() };
      this.save();
    }
  }

  updatePreferences(prefs: Partial<UserPreferences>): void {
    this.db.settings = { ...this.db.settings, ...prefs };
    if (this.db.user) this.db.user.preferences = this.db.settings;
    this.save();
  }

  getSettings(): UserPreferences { return this.db.settings; }

  // APPLICATIONS
  createApplication(data: Partial<Application>): string {
    const id = generateId();
    const now = new Date().toISOString();
    const app: Application = {
      id,
      userId: this.db.user?.id || '',
      companyName: data.companyName || '',
      roleTitle: data.roleTitle || '',
      location: data.location || '',
      workType: data.workType || 'unspecified',
      jobPostingUrl: data.jobPostingUrl || '',
      jobDescription: data.jobDescription || '',
      salary: data.salary || { amount: null, period: 'unspecified', notes: '' },
      stage: data.stage || 'wishlist',
      priority: data.priority || 'medium',
      deadline: data.deadline || null,
      appliedDate: data.appliedDate || null,
      followUpDate: data.followUpDate || null,
      lastContactDate: null,
      expectedResponseDate: null,
      contacts: [],
      documents: [],
      interviews: [],
      notes: [],
      tags: data.tags || [],
      source: data.source || '',
      referralInfo: data.referralInfo || { contactId: null, contactName: '', status: 'not_asked' },
      timeline: [{
        id: generateId(), type: 'created',
        description: 'Application created', metadata: {}, timestamp: now,
      }],
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
    this.db.applications[id] = app;
    this.updateUserStats();
    this.generateRemindersForApplication(id);
    this.save();
    return id;
  }

  getApplicationById(id: string): Application | null {
    return this.db.applications[id] || null;
  }

  getAllApplications(includeArchived = false): Application[] {
    return Object.values(this.db.applications)
      .filter(a => includeArchived || !a.isArchived)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  getApplicationsByStage(stage: PipelineStage): Application[] {
    return this.getAllApplications().filter(a => a.stage === stage);
  }

  getApplicationsByPipeline(): Record<PipelineStage, Application[]> {
    const stages: PipelineStage[] = [
      'wishlist', 'researching', 'ready_to_apply', 'applied',
      'phone_screen', 'interview_scheduled', 'interview_completed',
      'offer_received', 'accepted', 'rejected', 'withdrawn',
    ];
    const pipeline: Record<string, Application[]> = {};
    stages.forEach(s => { pipeline[s] = this.getApplicationsByStage(s); });
    return pipeline as Record<PipelineStage, Application[]>;
  }

  updateApplication(id: string, updates: Partial<Application>): void {
    const app = this.db.applications[id];
    if (!app) return;
    const oldStage = app.stage;
    const newStage = updates.stage;
    this.db.applications[id] = { ...app, ...updates, updatedAt: new Date().toISOString() };
    if (newStage && newStage !== oldStage) {
      this.addTimelineEvent(id, {
        type: 'stage_changed',
        description: `Stage changed from ${this.formatStage(oldStage)} to ${this.formatStage(newStage)}`,
        fromStage: oldStage, toStage: newStage, metadata: {},
      });
      if (newStage === 'applied' && !this.db.applications[id].appliedDate) {
        this.db.applications[id].appliedDate = new Date().toISOString().split('T')[0];
        this.db.applications[id].followUpDate = this.calculateFollowUpDate();
      }
    }
    this.updateUserStats();
    this.generateRemindersForApplication(id);
    this.save();
  }

  updateApplicationStage(id: string, newStage: PipelineStage): void {
    this.updateApplication(id, { stage: newStage });
  }

  archiveApplication(id: string): void {
    const app = this.db.applications[id];
    if (app) { app.isArchived = true; app.updatedAt = new Date().toISOString(); this.updateUserStats(); this.save(); }
  }

  deleteApplication(id: string): void {
    delete this.db.applications[id];
    this.updateUserStats();
    this.save();
  }

  private addTimelineEvent(appId: string, event: Partial<TimelineEvent>): void {
    const app = this.db.applications[appId];
    if (!app) return;
    app.timeline.push({
      id: generateId(), type: event.type || 'note_added',
      description: event.description || '', fromStage: event.fromStage,
      toStage: event.toStage, metadata: event.metadata || {},
      timestamp: new Date().toISOString(),
    });
  }

  // NOTES
  addNote(appId: string, content: string, tags: string[] = []): string {
    const app = this.db.applications[appId];
    if (!app) return '';
    const note: ApplicationNote = {
      id: generateId(), content, tags,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    app.notes.unshift(note);
    this.addTimelineEvent(appId, { type: 'note_added', description: 'Note added', metadata: { noteId: note.id } });
    this.logDailyActivity('notesAdded');
    this.save();
    return note.id;
  }

  updateNote(appId: string, noteId: string, content: string): void {
    const app = this.db.applications[appId];
    if (!app) return;
    const note = app.notes.find(n => n.id === noteId);
    if (note) { note.content = content; note.updatedAt = new Date().toISOString(); this.save(); }
  }

  deleteNote(appId: string, noteId: string): void {
    const app = this.db.applications[appId];
    if (!app) return;
    app.notes = app.notes.filter(n => n.id !== noteId);
    this.save();
  }

  // INTERVIEWS
  addInterview(appId: string, data: Partial<Interview>): string {
    const app = this.db.applications[appId];
    if (!app) return '';
    const id = generateId();
    const interview: Interview = {
      id, applicationId: appId, round: data.round || 'phone_screen',
      roundNumber: app.interviews.length + 1, status: data.status || 'scheduled',
      scheduledDate: data.scheduledDate || '', scheduledTime: data.scheduledTime || '',
      duration: data.duration || 60, interviewers: data.interviewers || [],
      format: data.format || 'video', location: data.location || '',
      meetingLink: data.meetingLink || '', preparation: [], questionsAsked: [],
      feedback: { overallRating: 3, strengths: '', weaknesses: '', surprises: '', nextSteps: '', followUpNotes: '' },
      notes: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    app.interviews.push(interview);
    if (app.stage === 'applied' || app.stage === 'phone_screen') {
      app.stage = 'interview_scheduled';
    }
    this.addTimelineEvent(appId, {
      type: 'interview_scheduled',
      description: `${this.formatInterviewRound(data.round)} interview scheduled`,
      metadata: { interviewId: id },
    });
    this.generateRemindersForApplication(appId);
    this.updateUserStats();
    this.save();
    return id;
  }

  updateInterview(appId: string, interviewId: string, updates: Partial<Interview>): void {
    const app = this.db.applications[appId];
    if (!app) return;
    const interview = app.interviews.find(i => i.id === interviewId);
    if (!interview) return;
    Object.assign(interview, { ...updates, updatedAt: new Date().toISOString() });
    if (updates.status === 'completed') {
      app.stage = 'interview_completed';
      this.addTimelineEvent(appId, {
        type: 'interview_completed',
        description: `${this.formatInterviewRound(interview.round)} interview completed`,
        metadata: { interviewId },
      });
    }
    this.updateUserStats();
    this.save();
  }

  addPrepItem(appId: string, interviewId: string, task: string): string {
    const app = this.db.applications[appId];
    if (!app) return '';
    const interview = app.interviews.find(i => i.id === interviewId);
    if (!interview) return '';
    const id = generateId();
    interview.preparation.push({ id, task, isCompleted: false, completedAt: null });
    this.save();
    return id;
  }

  togglePrepItem(appId: string, interviewId: string, prepId: string): void {
    const app = this.db.applications[appId];
    if (!app) return;
    const interview = app.interviews.find(i => i.id === interviewId);
    if (!interview) return;
    const item = interview.preparation.find(p => p.id === prepId);
    if (item) {
      item.isCompleted = !item.isCompleted;
      item.completedAt = item.isCompleted ? new Date().toISOString() : null;
      this.save();
    }
  }

  addInterviewQuestion(appId: string, interviewId: string, q: Partial<InterviewQuestion>): string {
    const app = this.db.applications[appId];
    if (!app) return '';
    const interview = app.interviews.find(i => i.id === interviewId);
    if (!interview) return '';
    const id = generateId();
    const question: InterviewQuestion = {
      id, question: q.question || '', type: q.type || 'general',
      difficulty: q.difficulty || 'medium', myAnswer: q.myAnswer || '',
      notes: q.notes || '', rating: q.rating || 3,
    };
    interview.questionsAsked.push(question);
    if (q.question) this.saveToQuestionBank({ ...question });
    this.save();
    return id;
  }

  private saveToQuestionBank(q: InterviewQuestion): void {
    const exists = this.db.questionBank.some(existing => existing.question.toLowerCase() === q.question.toLowerCase());
    if (!exists) this.db.questionBank.push(q);
  }

  getQuestionBank(): InterviewQuestion[] { return this.db.questionBank; }

  // CONTACTS
  createContact(data: Partial<Contact>): string {
    const id = generateId();
    const contact: Contact = {
      id, userId: this.db.user?.id || '',
      firstName: data.firstName || '', lastName: data.lastName || '',
      email: data.email || '', phone: data.phone || '',
      company: data.company || '', role: data.role || '',
      contactRole: data.contactRole || 'other',
      linkedinUrl: data.linkedinUrl || '', notes: data.notes || '',
      tags: data.tags || [], interactions: [], referralsGiven: [],
      lastContactedAt: null, nextFollowUpDate: null,
      relationshipStrength: data.relationshipStrength || 3,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    this.db.contacts[id] = contact;
    this.save();
    return id;
  }

  getContactById(id: string): Contact | null { return this.db.contacts[id] || null; }

  getAllContacts(): Contact[] {
    return Object.values(this.db.contacts)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  updateContact(id: string, updates: Partial<Contact>): void {
    if (this.db.contacts[id]) {
      this.db.contacts[id] = { ...this.db.contacts[id], ...updates, updatedAt: new Date().toISOString() };
      this.save();
    }
  }

  deleteContact(id: string): void {
    delete this.db.contacts[id];
    this.save();
  }

  addInteraction(contactId: string, data: Partial<Interaction>): string {
    const contact = this.db.contacts[contactId];
    if (!contact) return '';
    const id = generateId();
    const interaction: Interaction = {
      id, contactId, type: data.type || 'email',
      date: data.date || new Date().toISOString().split('T')[0],
      notes: data.notes || '', applicationId: data.applicationId || null,
      outcome: data.outcome || '', followUpNeeded: data.followUpNeeded ?? false,
      followUpDate: data.followUpDate || null, createdAt: new Date().toISOString(),
    };
    contact.interactions.unshift(interaction);
    contact.lastContactedAt = interaction.date;
    if (interaction.followUpDate) contact.nextFollowUpDate = interaction.followUpDate;
    contact.updatedAt = new Date().toISOString();
    this.logDailyActivity('contactsReached');
    this.save();
    return id;
  }

  // DOCUMENTS
  createDocument(data: Partial<Document>): string {
    const id = generateId();
    const doc: Document = {
      id, userId: this.db.user?.id || '', name: data.name || 'Untitled',
      type: data.type || 'resume', version: data.version || '1.0',
      fileData: data.fileData || '', fileName: data.fileName || '',
      fileSize: data.fileSize || 0, tags: data.tags || [],
      isDefault: false, usedInApplications: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    this.db.documents[id] = doc;
    this.save();
    return id;
  }

  getDocumentById(id: string): Document | null { return this.db.documents[id] || null; }

  getAllDocuments(): Document[] {
    return Object.values(this.db.documents)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  getDocumentsByType(type: DocumentType): Document[] {
    return this.getAllDocuments().filter(d => d.type === type);
  }

  updateDocument(id: string, updates: Partial<Document>): void {
    if (this.db.documents[id]) {
      this.db.documents[id] = { ...this.db.documents[id], ...updates, updatedAt: new Date().toISOString() };
      this.save();
    }
  }

  deleteDocument(id: string): void {
    delete this.db.documents[id];
    this.save();
  }

  attachDocumentToApplication(docId: string, appId: string): void {
    const doc = this.db.documents[docId];
    const app = this.db.applications[appId];
    if (!doc || !app) return;
    if (!doc.usedInApplications.includes(appId)) doc.usedInApplications.push(appId);
    const existing = app.documents.find(d => d.documentId === docId);
    if (!existing) {
      app.documents.push({ documentId: docId, documentName: doc.name, type: doc.type, version: doc.version, submittedAt: null });
      this.addTimelineEvent(appId, { type: 'document_attached', description: `Document "${doc.name}" attached`, metadata: { documentId: docId } });
    }
    this.save();
  }

  detachDocumentFromApplication(docId: string, appId: string): void {
    const app = this.db.applications[appId];
    if (!app) return;
    app.documents = app.documents.filter(d => d.documentId !== docId);
    const doc = this.db.documents[docId];
    if (doc) doc.usedInApplications = doc.usedInApplications.filter(id => id !== appId);
    this.save();
  }

  // REMINDERS
  generateRemindersForApplication(appId: string): void {
    const app = this.db.applications[appId];
    if (!app) return;
    Object.keys(this.db.reminders).forEach(rid => {
      if (this.db.reminders[rid].applicationId === appId && !this.db.reminders[rid].isCompleted) {
        delete this.db.reminders[rid];
      }
    });
    const userId = this.db.user?.id || '';
    if (app.deadline) {
      this.createReminder({ userId, applicationId: appId, type: 'deadline', title: `Deadline: ${app.companyName} - ${app.roleTitle}`, description: 'Application deadline approaching', dueDate: app.deadline, dueTime: '23:59', priority: app.priority });
    }
    if (app.followUpDate && app.stage === 'applied') {
      this.createReminder({ userId, applicationId: appId, type: 'follow_up', title: `Follow up: ${app.companyName} - ${app.roleTitle}`, description: 'Send follow-up email', dueDate: app.followUpDate, dueTime: '09:00', priority: 'medium' });
    }
    app.interviews.forEach(interview => {
      if (interview.status === 'scheduled' && interview.scheduledDate) {
        this.createReminder({ userId, applicationId: appId, interviewId: interview.id, type: 'interview', title: `Interview: ${app.companyName} - ${app.roleTitle}`, description: `${this.formatInterviewRound(interview.round)} interview`, dueDate: interview.scheduledDate, dueTime: interview.scheduledTime || '09:00', priority: 'high' });
        const prepDate = new Date(interview.scheduledDate);
        prepDate.setDate(prepDate.getDate() - 1);
        this.createReminder({ userId, applicationId: appId, interviewId: interview.id, type: 'prep', title: `Prep: ${app.companyName} interview tomorrow`, description: `Prepare for ${this.formatInterviewRound(interview.round)} interview`, dueDate: prepDate.toISOString().split('T')[0], dueTime: '18:00', priority: 'high' });
      }
    });
  }

  private createReminder(data: Partial<Reminder>): string {
    const id = generateId();
    this.db.reminders[id] = {
      id, userId: data.userId || '', applicationId: data.applicationId || null,
      contactId: data.contactId || null, interviewId: data.interviewId || null,
      type: data.type || 'custom', title: data.title || '', description: data.description || '',
      dueDate: data.dueDate || '', dueTime: data.dueTime || '09:00',
      isCompleted: false, completedAt: null, priority: data.priority || 'medium',
      snoozedUntil: null, createdAt: new Date().toISOString(),
    };
    return id;
  }

  createCustomReminder(data: Partial<Reminder>): string {
    const id = this.createReminder(data);
    this.save();
    return id;
  }

  getUpcomingReminders(limit = 10): Reminder[] {
    const now = new Date();
    return Object.values(this.db.reminders)
      .filter(r => !r.isCompleted && new Date(`${r.dueDate}T${r.dueTime}`) >= now)
      .sort((a, b) => new Date(`${a.dueDate}T${a.dueTime}`).getTime() - new Date(`${b.dueDate}T${b.dueTime}`).getTime())
      .slice(0, limit);
  }

  getOverdueReminders(): Reminder[] {
    const now = new Date();
    return Object.values(this.db.reminders)
      .filter(r => !r.isCompleted && new Date(`${r.dueDate}T${r.dueTime}`) < now)
      .sort((a, b) => new Date(`${a.dueDate}T${a.dueTime}`).getTime() - new Date(`${b.dueDate}T${b.dueTime}`).getTime());
  }

  getAllReminders(): Reminder[] {
    return Object.values(this.db.reminders);
  }

  completeReminder(id: string): void {
    if (this.db.reminders[id]) {
      this.db.reminders[id].isCompleted = true;
      this.db.reminders[id].completedAt = new Date().toISOString();
      this.save();
    }
  }

  snoozeReminder(id: string, untilDate: string): void {
    if (this.db.reminders[id]) {
      this.db.reminders[id].snoozedUntil = untilDate;
      this.save();
    }
  }

  // STATS
  updateUserStats(): void {
    if (!this.db.user) return;
    const apps = this.getAllApplications();
    const activeStages: PipelineStage[] = ['wishlist', 'researching', 'ready_to_apply', 'applied', 'phone_screen', 'interview_scheduled', 'interview_completed', 'offer_received'];
    let interviewsScheduled = 0, interviewsCompleted = 0, offersReceived = 0, offersAccepted = 0;
    let totalResponseTime = 0, responseCount = 0;
    apps.forEach(app => {
      interviewsScheduled += app.interviews.filter(i => i.status === 'scheduled').length;
      interviewsCompleted += app.interviews.filter(i => i.status === 'completed').length;
      if (app.stage === 'offer_received' || app.stage === 'accepted') offersReceived++;
      if (app.stage === 'accepted') offersAccepted++;
      if (app.appliedDate && ['phone_screen', 'interview_scheduled', 'interview_completed', 'offer_received', 'accepted'].includes(app.stage)) {
        const applied = new Date(app.appliedDate);
        const responded = new Date(app.updatedAt);
        totalResponseTime += (responded.getTime() - applied.getTime()) / 86400000;
        responseCount++;
      }
    });
    const activeApps = apps.filter(a => activeStages.includes(a.stage)).length;
    const appliedApps = apps.filter(a => !['wishlist', 'researching', 'ready_to_apply'].includes(a.stage)).length;
    const oldStats = this.db.user.stats;
    this.db.user.stats = {
      totalApplications: apps.length, activeApplications: activeApps,
      interviewsScheduled, interviewsCompleted, offersReceived, offersAccepted,
      responseRate: appliedApps > 0 ? Math.round((responseCount / appliedApps) * 100) : 0,
      interviewRate: appliedApps > 0 ? Math.round((interviewsCompleted / appliedApps) * 100) : 0,
      offerRate: interviewsCompleted > 0 ? Math.round((offersReceived / interviewsCompleted) * 100) : 0,
      averageResponseTime: responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0,
      currentStreak: oldStats.currentStreak, longestStreak: oldStats.longestStreak,
      weeklyApplications: this.getWeeklyApplicationCount(),
    };
  }

  private getWeeklyApplicationCount(): number {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    return Object.values(this.db.applications).filter(a => new Date(a.createdAt) >= weekAgo).length;
  }

  private logDailyActivity(action: 'applicationsSubmitted' | 'interviewsCompleted' | 'notesAdded' | 'contactsReached'): void {
    const today = new Date().toISOString().split('T')[0];
    let log = this.db.dailyLogs.find(l => l.date === today);
    if (!log) {
      log = { date: today, applicationsSubmitted: 0, interviewsCompleted: 0, notesAdded: 0, contactsReached: 0, goalMet: false };
      this.db.dailyLogs.push(log);
    }
    log[action]++;
    if (this.db.user) {
      const weeklyApps = this.getWeeklyApplicationCount();
      log.goalMet = weeklyApps >= this.db.user.preferences.weeklyApplicationGoal;
    }
  }

  getDailyLogs(days = 30): DailyLog[] {
    return this.db.dailyLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, days);
  }

  // NOTIFICATIONS
  addNotification(n: Partial<Notification>): string {
    const id = generateId();
    this.db.notifications.unshift({
      id, userId: this.db.user?.id || '', type: n.type || 'weekly_summary',
      title: n.title || '', message: n.message || '', read: false,
      data: n.data || {}, createdAt: new Date().toISOString(),
    });
    if (this.db.notifications.length > 50) this.db.notifications = this.db.notifications.slice(0, 50);
    this.save();
    return id;
  }

  getNotifications(): Notification[] { return this.db.notifications; }
  getUnreadCount(): number { return this.db.notifications.filter(n => !n.read).length; }

  markNotificationRead(id: string): void {
    const n = this.db.notifications.find(n => n.id === id);
    if (n) { n.read = true; this.save(); }
  }

  markAllNotificationsRead(): void {
    this.db.notifications.forEach(n => { n.read = true; });
    this.save();
  }

  // SEARCH
  searchApplications(query: string): Application[] {
    const q = query.toLowerCase();
    return this.getAllApplications().filter(a =>
      a.companyName.toLowerCase().includes(q) ||
      a.roleTitle.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q)) ||
      a.notes.some(n => n.content.toLowerCase().includes(q))
    );
  }

  searchContacts(query: string): Contact[] {
    const q = query.toLowerCase();
    return this.getAllContacts().filter(c =>
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q)
    );
  }

  // EXPORT/IMPORT
  exportAllData(): string {
    return JSON.stringify({
      applications: this.db.applications, contacts: this.db.contacts,
      documents: this.db.documents, dailyLogs: this.db.dailyLogs,
      questionBank: this.db.questionBank, exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  importData(json: string): boolean {
    try {
      const data = JSON.parse(json);
      if (data.applications) this.db.applications = { ...this.db.applications, ...data.applications };
      if (data.contacts) this.db.contacts = { ...this.db.contacts, ...data.contacts };
      if (data.documents) this.db.documents = { ...this.db.documents, ...data.documents };
      if (data.dailyLogs) this.db.dailyLogs = data.dailyLogs;
      if (data.questionBank) this.db.questionBank = data.questionBank;
      this.updateUserStats();
      this.save();
      return true;
    } catch { return false; }
  }

  clearAllData(): void {
    const emptyDb = getEmptyDB();
    this.db = emptyDb;
    this.save();
  }

  // HELPERS
  formatStage(stage: PipelineStage): string {
    const labels: Record<PipelineStage, string> = {
      wishlist: 'Wishlist', researching: 'Researching', ready_to_apply: 'Ready to Apply',
      applied: 'Applied', phone_screen: 'Phone Screen', interview_scheduled: 'Interview Scheduled',
      interview_completed: 'Interview Completed', offer_received: 'Offer Received',
      accepted: 'Accepted', rejected: 'Rejected', withdrawn: 'Withdrawn',
    };
    return labels[stage];
  }

  formatInterviewRound(round: InterviewRound | undefined): string {
    const labels: Record<InterviewRound, string> = {
      phone_screen: 'Phone Screen', technical: 'Technical', behavioral: 'Behavioral',
      case_study: 'Case Study', take_home: 'Take Home', panel: 'Panel', final: 'Final', other: 'Other',
    };
    return round ? labels[round] : 'Interview';
  }

  private calculateFollowUpDate(): string {
    const days = this.db.settings.defaultFollowUpDays || 7;
    const date = new Date();
    date.setDate(date.getDate() + days);
    while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }

  // Link contact to application
  addContactToApplication(appId: string, contactId: string, role: string, isPrimary: boolean): void {
    const app = this.db.applications[appId];
    const contact = this.db.contacts[contactId];
    if (!app || !contact) return;
    const existing = app.contacts.find(c => c.contactId === contactId);
    if (!existing) {
      if (isPrimary) app.contacts.forEach(c => { c.isPrimary = false; });
      app.contacts.push({
        contactId, name: `${contact.firstName} ${contact.lastName}`,
        role: role as ContactRole, isPrimary,
      });
      this.addTimelineEvent(appId, { type: 'contact_added', description: `Contact ${contact.firstName} ${contact.lastName} added`, metadata: { contactId } });
      app.updatedAt = new Date().toISOString();
      this.save();
    }
  }

  removeContactFromApplication(appId: string, contactId: string): void {
    const app = this.db.applications[appId];
    if (!app) return;
    app.contacts = app.contacts.filter(c => c.contactId !== contactId);
    app.updatedAt = new Date().toISOString();
    this.save();
  }
}

let instance: InternTrackPersistence | null = null;

export const getPersistence = (): InternTrackPersistence => {
  if (!instance) instance = new InternTrackPersistence();
  return instance;
};
