export type PipelineStage =
  | 'wishlist'
  | 'researching'
  | 'ready_to_apply'
  | 'applied'
  | 'phone_screen'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'offer_received'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export type ApplicationStatus = PipelineStage;
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type WorkType = 'remote' | 'hybrid' | 'onsite' | 'unspecified';
export type ContactRole = 'recruiter' | 'hiring_manager' | 'referral' | 'alumni' | 'peer' | 'professor' | 'other';
export type InteractionType = 'email' | 'call' | 'coffee_chat' | 'linkedin' | 'career_fair' | 'info_session' | 'interview' | 'other';
export type DocumentType = 'resume' | 'cover_letter' | 'portfolio' | 'transcript' | 'writing_sample' | 'other';
export type InterviewRound = 'phone_screen' | 'technical' | 'behavioral' | 'case_study' | 'take_home' | 'panel' | 'final' | 'other';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';

export interface User {
  id: string;
  email: string;
  fullName: string;
  university: string;
  major: string;
  graduationDate: string;
  targetIndustries: string[];
  targetRoles: string[];
  preferences: UserPreferences;
  stats: UserStats;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  defaultFollowUpDays: number;
  reminderBeforeDeadline: number;
  weeklyApplicationGoal: number;
  colorScheme: 'light' | 'dark' | 'system';
  boardView: 'compact' | 'comfortable' | 'expanded';
}

export interface UserStats {
  totalApplications: number;
  activeApplications: number;
  interviewsScheduled: number;
  interviewsCompleted: number;
  offersReceived: number;
  offersAccepted: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  averageResponseTime: number;
  currentStreak: number;
  longestStreak: number;
  weeklyApplications: number;
}

export interface Application {
  id: string;
  userId: string;
  companyName: string;
  roleTitle: string;
  location: string;
  workType: WorkType;
  jobPostingUrl: string;
  jobDescription: string;
  salary: {
    amount: number | null;
    period: 'hourly' | 'monthly' | 'yearly' | 'unspecified';
    notes: string;
  };
  stage: PipelineStage;
  priority: Priority;
  deadline: string | null;
  appliedDate: string | null;
  followUpDate: string | null;
  lastContactDate: string | null;
  expectedResponseDate: string | null;
  contacts: ApplicationContact[];
  documents: ApplicationDocument[];
  interviews: Interview[];
  notes: ApplicationNote[];
  tags: string[];
  source: string;
  referralInfo: {
    contactId: string | null;
    contactName: string;
    status: 'not_asked' | 'asked' | 'confirmed' | 'submitted' | 'declined';
  };
  timeline: TimelineEvent[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationContact {
  contactId: string;
  name: string;
  role: ContactRole;
  isPrimary: boolean;
}

export interface ApplicationDocument {
  documentId: string;
  documentName: string;
  type: DocumentType;
  version: string;
  submittedAt: string | null;
}

export interface ApplicationNote {
  id: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: string;
  type: 'created' | 'stage_changed' | 'note_added' | 'document_attached' |
        'interview_scheduled' | 'interview_completed' | 'contact_added' |
        'follow_up_sent' | 'deadline_set' | 'offer_received' | 'accepted' | 'rejected';
  description: string;
  fromStage?: PipelineStage;
  toStage?: PipelineStage;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  round: InterviewRound;
  roundNumber: number;
  status: InterviewStatus;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  interviewers: string[];
  format: 'phone' | 'video' | 'in_person' | 'take_home';
  location: string;
  meetingLink: string;
  preparation: InterviewPrepItem[];
  questionsAsked: InterviewQuestion[];
  feedback: InterviewFeedback;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewPrepItem {
  id: string;
  task: string;
  isCompleted: boolean;
  completedAt: string | null;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  type: 'technical' | 'behavioral' | 'case' | 'general';
  difficulty: 'easy' | 'medium' | 'hard';
  myAnswer: string;
  notes: string;
  rating: 1 | 2 | 3 | 4 | 5;
}

export interface InterviewFeedback {
  overallRating: 1 | 2 | 3 | 4 | 5;
  strengths: string;
  weaknesses: string;
  surprises: string;
  nextSteps: string;
  followUpNotes: string;
}

export interface Contact {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  contactRole: ContactRole;
  linkedinUrl: string;
  notes: string;
  tags: string[];
  interactions: Interaction[];
  referralsGiven: ReferralRecord[];
  lastContactedAt: string | null;
  nextFollowUpDate: string | null;
  relationshipStrength: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
  updatedAt: string;
}

export interface Interaction {
  id: string;
  contactId: string;
  type: InteractionType;
  date: string;
  notes: string;
  applicationId: string | null;
  outcome: string;
  followUpNeeded: boolean;
  followUpDate: string | null;
  createdAt: string;
}

export interface ReferralRecord {
  id: string;
  contactId: string;
  applicationId: string;
  companyName: string;
  roleTitle: string;
  status: 'requested' | 'confirmed' | 'submitted' | 'declined' | 'expired';
  requestedAt: string;
  submittedAt: string | null;
  outcome: string;
}

export interface Document {
  id: string;
  userId: string;
  name: string;
  type: DocumentType;
  version: string;
  fileData: string;
  fileName: string;
  fileSize: number;
  tags: string[];
  isDefault: boolean;
  usedInApplications: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  applicationId: string | null;
  contactId: string | null;
  interviewId: string | null;
  type: 'deadline' | 'follow_up' | 'interview' | 'prep' | 'custom';
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  isCompleted: boolean;
  completedAt: string | null;
  priority: Priority;
  snoozedUntil: string | null;
  createdAt: string;
}

export interface DailyLog {
  date: string;
  applicationsSubmitted: number;
  interviewsCompleted: number;
  notesAdded: number;
  contactsReached: number;
  goalMet: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'deadline_approaching' | 'follow_up_due' | 'interview_tomorrow' |
        'application_stale' | 'streak_milestone' | 'weekly_summary';
  title: string;
  message: string;
  read: boolean;
  data: Record<string, unknown>;
  createdAt: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  'wishlist', 'researching', 'ready_to_apply', 'applied',
  'phone_screen', 'interview_scheduled', 'interview_completed',
  'offer_received', 'accepted', 'rejected', 'withdrawn',
];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  wishlist: 'Wishlist',
  researching: 'Researching',
  ready_to_apply: 'Ready to Apply',
  applied: 'Applied',
  phone_screen: 'Phone Screen',
  interview_scheduled: 'Interview Scheduled',
  interview_completed: 'Interview Completed',
  offer_received: 'Offer Received',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const STAGE_COLORS: Record<PipelineStage, { bg: string; text: string; border: string; header: string }> = {
  wishlist: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', header: 'bg-slate-100' },
  researching: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', header: 'bg-blue-100' },
  ready_to_apply: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', header: 'bg-violet-100' },
  applied: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', header: 'bg-teal-100' },
  phone_screen: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', header: 'bg-orange-100' },
  interview_scheduled: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', header: 'bg-yellow-100' },
  interview_completed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', header: 'bg-green-100' },
  offer_received: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', header: 'bg-amber-100' },
  accepted: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', header: 'bg-emerald-100' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', header: 'bg-red-100' },
  withdrawn: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', header: 'bg-gray-100' },
};

export const PRIORITY_COLORS: Record<Priority, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-l-green-400' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-l-yellow-400' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-l-orange-400' },
  urgent: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-l-red-500' },
};
