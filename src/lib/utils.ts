import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format, differenceInDays, parseISO, isValid } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined, fmt = 'MMM d, yyyy'): string {
  if (!dateStr) return '';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return '';
    return format(date, fmt);
  } catch {
    return '';
  }
}

export function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return '';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '';
  }
}

export function getDaysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return null;
    return differenceInDays(date, new Date());
  } catch {
    return null;
  }
}

export function getDeadlineUrgency(dateStr: string | null | undefined): 'overdue' | 'critical' | 'warning' | 'normal' | null {
  const days = getDaysUntil(dateStr);
  if (days === null) return null;
  if (days < 0) return 'overdue';
  if (days === 0) return 'critical';
  if (days <= 3) return 'critical';
  if (days <= 7) return 'warning';
  return 'normal';
}

export function getDeadlineColor(urgency: ReturnType<typeof getDeadlineUrgency>): string {
  switch (urgency) {
    case 'overdue': return 'text-red-600 bg-red-50';
    case 'critical': return 'text-red-600 bg-red-50';
    case 'warning': return 'text-orange-600 bg-orange-50';
    case 'normal': return 'text-green-600 bg-green-50';
    default: return 'text-gray-500';
  }
}

export function formatDeadlineLabel(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const days = getDaysUntil(dateStr);
  if (days === null) return '';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days}d`;
}

export function generateInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function toTitleCase(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function sortByDate<T extends Record<string, unknown>>(items: T[], key: keyof T, desc = true): T[] {
  return [...items].sort((a, b) => {
    const aDate = new Date(a[key] as string).getTime();
    const bDate = new Date(b[key] as string).getTime();
    return desc ? bDate - aDate : aDate - bDate;
  });
}

export function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export function formatSalary(amount: number | null, period: string): string {
  if (!amount) return '';
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  const periodMap: Record<string, string> = {
    hourly: '/hr', monthly: '/mo', yearly: '/yr', unspecified: '',
  };
  return `${formatted}${periodMap[period] || ''}`;
}

export function getDaysBetween(start: string, end: string): number {
  return differenceInDays(parseISO(end), parseISO(start));
}

export function getCurrentWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function isThisWeek(dateStr: string): boolean {
  const { start, end } = getCurrentWeekRange();
  const date = parseISO(dateStr);
  return date >= start && date <= end;
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
