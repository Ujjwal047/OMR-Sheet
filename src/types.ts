export interface Section {
  id: string;
  name: string;
  count: number;
  optionsCount: number;
  startIdx: number; // 1-based global index start
}

export type TimerMode = 'stopwatch' | 'timer';

export interface ExamConfig {
  testName: string;
  correctMark: number;
  negativeMark: number;
  sections: Section[];
  timerMode?: TimerMode;
  timeLimitMinutes?: number; // duration in minutes if timerMode === 'timer'
  antiCheatAlerts?: boolean;
}

export interface ExamBackup {
  testName: string;
  correctMark: number;
  negativeMark: number;
  sections: Section[];
  totalQ: number;
  userAnswers: Record<number, string>;
  flaggedQuestions?: Record<number, boolean>;
  totalSeconds: number;
  timerMode?: TimerMode;
  timeLimitMinutes?: number;
  lastSaved: number;
}

export interface ExamResult {
  id: string;
  testName: string;
  date: string;
  totalQ: number;
  correctCount: number;
  wrongCount: number;
  naCount: number;
  score: number;
  maxScore: number;
  percentage: number;
  accuracy: number;
  timeTakenSeconds: number;
  correctMark: number;
  negativeMark: number;
  sections: Section[];
  userAnswers: Record<number, string>;
  keyAnswers: Record<number, string>;
  hiddenQuestionIds: number[]; // global question indices
}

export type ExamScreen = 'setup' | 'test' | 'key' | 'result' | 'review';
