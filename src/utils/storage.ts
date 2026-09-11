import { ExamBackup, ExamResult } from '../types';

const BACKUP_KEY = 'omr_backup';
const HISTORY_KEY = 'omr_history';

export function getExamBackup(): ExamBackup | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ExamBackup;
  } catch (e) {
    console.error('Failed to parse backup', e);
    return null;
  }
}

export function saveExamBackup(backup: ExamBackup): void {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
  } catch (e) {
    console.error('Failed to save backup', e);
  }
}

export function clearExamBackup(): void {
  try {
    localStorage.removeItem(BACKUP_KEY);
  } catch (e) {
    console.error('Failed to clear backup', e);
  }
}

// Primary key for previous tests as explicitly requested: 'previous_tests'
export const PREVIOUS_TESTS_KEY = 'previous_tests';
export const LEGACY_HISTORY_KEY = 'omr_history';

export function getExamHistory(): ExamResult[] {
  try {
    let raw = localStorage.getItem(PREVIOUS_TESTS_KEY);
    // Backward compatibility: If no data under 'previous_tests', check legacy keys
    if (!raw) {
      raw = localStorage.getItem(LEGACY_HISTORY_KEY) || localStorage.getItem('omr_history_exams');
      if (raw) {
        // Automatically migrate to 'previous_tests'
        localStorage.setItem(PREVIOUS_TESTS_KEY, raw);
      }
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to parse previous_tests from localStorage', e);
    return [];
  }
}

export function saveExamToHistory(result: ExamResult): void {
  try {
    const current = getExamHistory();
    // Guarantee retention: keep all exams, avoid duplicates by ID, keep up to 100 historical tests
    const filtered = current.filter(r => r.id !== result.id);
    const updated = [result, ...filtered].slice(0, 100);
    // Explicitly write to localStorage with key 'previous_tests'
    localStorage.setItem(PREVIOUS_TESTS_KEY, JSON.stringify(updated));
    // Also keep legacy key synced for backup
    localStorage.setItem(LEGACY_HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save previous_tests to localStorage', e);
  }
}

export function formatRelativeExamAge(dateString: string): string {
  try {
    const time = new Date(dateString).getTime();
    if (isNaN(time)) return 'Saved in Previous Tests';
    const diffMs = Date.now() - time;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Given just now • Kept in Previous';
    if (diffHours < 24) return `Given ${diffHours}h ago • Kept in Previous`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Given yesterday • 2-day guarantee';
    return `Given ${diffDays} days ago • Saved in Previous`;
  } catch {
    return 'Saved in Previous Tests';
  }
}

export function deleteExamFromHistory(id: string): void {
  try {
    const current = getExamHistory();
    const updated = current.filter(r => r.id !== id);
    localStorage.setItem(PREVIOUS_TESTS_KEY, JSON.stringify(updated));
    localStorage.setItem(LEGACY_HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete exam history', e);
  }
}

export function formatTime(seconds: number): string {
  const safeSec = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(safeSec / 3600).toString().padStart(2, '0');
  const mins = Math.floor((safeSec % 3600) / 60).toString().padStart(2, '0');
  const secs = (safeSec % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

export function formatTimeCompact(seconds: number): string {
  const safeSec = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(safeSec / 3600);
  const mins = Math.floor((safeSec % 3600) / 60).toString().padStart(2, '0');
  const secs = (safeSec % 60).toString().padStart(2, '0');
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins}:${secs}`;
  }
  return `${mins}:${secs}`;
}

export function playTimesUpSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.3); // D6
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
    if (navigator.vibrate) {
      navigator.vibrate([300, 150, 300]);
    }
  } catch {
    // Ignore autoplay or audio context constraints
  }
}

export function computeNextMockName(currentName?: string, allHistory: ExamResult[] = []): string {
  if (currentName) {
    const match = currentName.match(/(.*?)(?:Mock(?:\s*Test)?\s*)(\d+)(.*)/i);
    if (match) {
      const prefix = match[1] || '';
      const num = parseInt(match[2], 10);
      const suffix = match[3] || '';
      return `${prefix}Mock Test ${num + 1}${suffix}`.trim();
    }
  }

  // Look in history to find highest Mock number
  let maxMockNum = 0;
  for (const h of allHistory) {
    const m = h.testName.match(/Mock(?:\s*Test)?\s*(\d+)/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxMockNum) maxMockNum = n;
    }
  }

  if (maxMockNum > 0) {
    return `Mock Test ${maxMockNum + 1}`;
  }

  return 'Mock Test 1';
}

export const ALPHABETS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
