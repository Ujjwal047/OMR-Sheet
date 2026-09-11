import { useState, useEffect } from 'react';
import { Section, ExamBackup, ExamResult, TimerMode } from '../types';
import { 
  getExamBackup, 
  clearExamBackup, 
  getExamHistory, 
  computeNextMockName, 
  formatTime,
  formatRelativeExamAge
} from '../utils/storage';
import { 
  Play, 
  RotateCcw, 
  History, 
  BookOpen, 
  Settings2, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Clock,
  Sparkles,
  Trash2,
  X,
  Trophy,
  ListChecks,
  Eye,
  EyeOff,
  CheckCheck,
  TrendingUp,
  Timer,
  Hourglass,
  Plus,
  Minus
} from 'lucide-react';

interface SetupScreenProps {
  onStartExam: (config: {
    testName: string;
    correctMark: number;
    negativeMark: number;
    initialSections?: Section[];
    timerMode?: TimerMode;
    timeLimitMinutes?: number;
    antiCheatAlerts?: boolean;
  }) => void;
  onResumeExam: (backup: ExamBackup) => void;
  onOpenHistory: () => void;
  history?: ExamResult[];
  onSelectHistoryResult?: (result: ExamResult) => void;
  onSelectHistoryReview?: (result: ExamResult) => void;
  onDeleteHistory?: (id: string) => void;
}

interface Preset {
  id: string;
  name: string;
  badge: string;
  sections: { count: number; options: number; name: string }[];
  cm: number;
  nm: number;
  timeMins?: number;
}

const PRESETS: Preset[] = [
  {
    id: 'blank',
    name: 'Dynamic (On-The-Fly)',
    badge: 'Standard',
    sections: [],
    cm: 2.0,
    nm: 0.5,
  },
  {
    id: 'upsc-prelims',
    name: 'UPSC GS Paper-I',
    badge: '100 Qs (4 opts)',
    sections: [{ count: 100, options: 4, name: 'General Studies' }],
    cm: 2.0,
    nm: 0.66,
    timeMins: 120,
  },
  {
    id: 'neet',
    name: 'NEET Practice',
    badge: '180 Qs (4 opts)',
    sections: [
      { count: 45, options: 4, name: 'Physics' },
      { count: 45, options: 4, name: 'Chemistry' },
      { count: 90, options: 4, name: 'Biology' },
    ],
    cm: 4.0,
    nm: 1.0,
    timeMins: 180,
  },
  {
    id: 'custom-50',
    name: 'Standard Mock (50 Qs)',
    badge: '50 Qs (4 opts)',
    sections: [{ count: 50, options: 4, name: 'Section 1' }],
    cm: 2.0,
    nm: 0.5,
    timeMins: 60,
  },
];

export default function SetupScreen({
  onStartExam,
  onResumeExam,
  onOpenHistory,
  history: propHistory,
  onSelectHistoryResult,
  onSelectHistoryReview,
  onDeleteHistory,
}: SetupScreenProps) {
  const [historyList, setHistoryList] = useState<ExamResult[]>(() => {
    const fromStorage = getExamHistory();
    return fromStorage.length > 0 ? fromStorage : (propHistory || []);
  });
  const [testName, setTestName] = useState(() => {
    const list = getExamHistory();
    return computeNextMockName(undefined, list);
  });
  const [correctMark, setCorrectMark] = useState<number>(2.0);
  const [negativeMark, setNegativeMark] = useState<number>(0.5);
  const [selectedPreset, setSelectedPreset] = useState<string>('blank');
  const [timerMode, setTimerMode] = useState<TimerMode>('stopwatch');
  const [timeLimit, setTimeLimit] = useState<number>(30);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('30');
  const [antiCheatAlerts, setAntiCheatAlerts] = useState<boolean>(true);
  const [backup, setBackup] = useState<ExamBackup | null>(null);
  const [historyCount, setHistoryCount] = useState<number>(() => {
    const fromStorage = getExamHistory();
    return fromStorage.length;
  });

  // Hide / Show Previous Tests state
  const [isSectionHidden, setIsSectionHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hide_previous_tests_section') === 'true';
    } catch {
      return false;
    }
  });

  const [hiddenTestIds, setHiddenTestIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('hidden_previous_test_ids');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const toggleHideSection = () => {
    setIsSectionHidden(prev => {
      const next = !prev;
      try {
        localStorage.setItem('hide_previous_tests_section', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleHideSingleTest = (id: string) => {
    setHiddenTestIds(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem('hidden_previous_test_ids', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleUnhideAllTests = () => {
    setHiddenTestIds([]);
    try {
      localStorage.removeItem('hidden_previous_test_ids');
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const savedBackup = getExamBackup();
    if (savedBackup) {
      setBackup(savedBackup);
    }
    // Always read freshly from localStorage.getItem('previous_tests')
    const freshStored = getExamHistory();
    const activeHistory = freshStored.length > 0 ? freshStored : (propHistory || []);
    setHistoryList(activeHistory);
    setHistoryCount(activeHistory.length);
  }, [propHistory]);

  const handleSelectPreset = (preset: Preset) => {
    setSelectedPreset(preset.id);
    setCorrectMark(preset.cm);
    setNegativeMark(preset.nm);
    if (preset.timeMins) {
      setTimerMode('timer');
      setTimeLimit(preset.timeMins);
      setCustomMinutesInput(String(preset.timeMins));
    } else if (preset.id === 'blank') {
      setTimerMode('stopwatch');
    }
    if (preset.id !== 'blank') {
      setTestName(`${preset.name} - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
    }
  };

  const handleStart = () => {
    const preset = PRESETS.find(p => p.id === selectedPreset);
    let initialSections: Section[] | undefined;

    if (preset && preset.sections.length > 0) {
      let currentStart = 1;
      initialSections = preset.sections.map((sec, idx) => {
        const item: Section = {
          id: `sec-${Date.now()}-${idx}`,
          name: sec.name,
          count: sec.count,
          optionsCount: sec.options,
          startIdx: currentStart,
        };
        currentStart += sec.count;
        return item;
      });
    }

    onStartExam({
      testName: testName.trim() || 'OMR Exam',
      correctMark: Number(correctMark) || 2,
      negativeMark: Number(negativeMark) || 0,
      initialSections,
      timerMode,
      timeLimitMinutes: timerMode === 'timer' ? Math.max(1, Number(timeLimit) || 30) : undefined,
      antiCheatAlerts,
    });
  };

  const handleDiscardBackup = () => {
    clearExamBackup();
    setBackup(null);
  };

  return (
    <div id="screen-setup" className="max-w-xl mx-auto min-h-screen bg-slate-50 flex flex-col pb-10">
      {/* Top Banner Header */}
      <header className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white px-5 py-4 shadow-md flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-xs font-bold text-lg border border-white/20">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight leading-none">OMR Exam Sheet</h1>
            <p className="text-xs text-cyan-100 mt-0.5 font-medium">Digital Bubble Sheet & Evaluator</p>
          </div>
        </div>

        {historyCount > 0 && (
          <button
            id="btn-open-history"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold backdrop-blur-xs transition border border-white/20 active:scale-95"
            title="Past Exam History"
          >
            <History className="w-3.5 h-3.5" />
            <span>Previous ({historyCount})</span>
          </button>
        )}
      </header>

      <main className="p-4 sm:p-5 flex-1 flex flex-col gap-4">
        {/* Resume Previous Test Banner if backup exists */}
        {backup && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative">
            {/* Top-right quick close button */}
            <button
              onClick={handleDiscardBackup}
              className="absolute top-2.5 right-2.5 p-1 text-amber-700/60 hover:text-amber-900 hover:bg-amber-200/60 rounded-lg transition"
              title="Is alert ko hatayein (Discard test)"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 pr-6 sm:pr-0">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                <RotateCcw className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-amber-900">Unfinished Test Found</h2>
                <p className="text-xs text-amber-700 mt-0.5">
                  &ldquo;{backup.testName}&rdquo; &bull; {backup.totalQ} Qs &bull; {Object.keys(backup.userAnswers || {}).length} answered
                </p>
                <span className="text-[11px] text-amber-600/90 font-mono">
                  Saved: {new Date(backup.lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0">
              <button
                id="btn-discard-test"
                onClick={handleDiscardBackup}
                className="flex-1 sm:flex-initial px-3 py-2 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200 text-xs font-bold rounded-lg shadow-2xs transition active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                title="Discard unfinished test"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hatao</span>
              </button>

              <button
                id="btn-resume-test"
                onClick={() => onResumeExam(backup)}
                className="flex-1 sm:flex-initial px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resume Test</span>
              </button>
            </div>
          </div>
        )}

        {/* Preset Selector */}
        <section className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
              Exam Structure Preset
            </h3>
            <span className="text-xs text-slate-400 font-medium">Select or build live</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {PRESETS.map((p) => {
              const isSelected = selectedPreset === p.id;
              return (
                <button
                  key={p.id}
                  id={`preset-${p.id}`}
                  onClick={() => handleSelectPreset(p)}
                  className={`p-3 rounded-xl text-left border transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-cyan-600 bg-cyan-50/60 ring-2 ring-cyan-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="font-semibold text-xs sm:text-sm text-slate-800 leading-snug">
                      {p.name}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-700">
                      {p.badge}
                    </span>
                    <span className="text-slate-400 font-medium">+{p.cm} / -{p.nm}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {selectedPreset === 'blank' && (
            <p className="text-[12px] text-slate-500 mt-3 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
              <span>You will add sections & questions dynamically as you attempt questions during the test.</span>
            </p>
          )}
        </section>

        {/* Configuration Card */}
        <section className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-4">
            <Settings2 className="w-3.5 h-3.5 text-cyan-600" />
            Test Details & Marking Scheme
          </h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="setup-testname" className="block text-xs font-semibold text-slate-700 mb-1">
                Test Title / Name
              </label>
              <input
                type="text"
                id="setup-testname"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="e.g. Mock Test 1, Biology Chapter 4"
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-lg text-sm text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label htmlFor="setup-cm" className="block text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1">
                  Correct Mark (+)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-emerald-600 font-bold text-sm">+</span>
                  <input
                    type="number"
                    id="setup-cm"
                    value={correctMark}
                    onChange={(e) => setCorrectMark(parseFloat(e.target.value) || 0)}
                    step="0.5"
                    min="0"
                    className="w-full pl-7 pr-3 py-2 bg-emerald-50/40 border border-emerald-300 rounded-lg text-sm font-bold text-emerald-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="setup-nm" className="block text-xs font-semibold text-rose-700 mb-1 flex items-center gap-1">
                  Negative Mark (-)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-rose-600 font-bold text-sm">-</span>
                  <input
                    type="number"
                    id="setup-nm"
                    value={negativeMark}
                    onChange={(e) => setNegativeMark(parseFloat(e.target.value) || 0)}
                    step="0.1"
                    min="0"
                    className="w-full pl-7 pr-3 py-2 bg-rose-50/40 border border-rose-300 rounded-lg text-sm font-bold text-rose-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Timer & Focus options */}
            <div className="pt-2 border-t border-slate-100 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Timer & Exam Duration Mode:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* Option 1: Stopwatch Mode (Default) */}
                  <button
                    type="button"
                    onClick={() => setTimerMode('stopwatch')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      timerMode === 'stopwatch'
                        ? 'bg-cyan-50/70 border-cyan-600 ring-2 ring-cyan-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        <Timer className={`w-4 h-4 ${timerMode === 'stopwatch' ? 'text-cyan-600' : 'text-slate-400'}`} />
                        <span>Stopwatch</span>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                        Default
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Free count-up (00:00 &rarr;). No time limit. Submit whenever you finish.
                    </p>
                  </button>

                  {/* Option 2: Countdown Timer Mode */}
                  <button
                    type="button"
                    onClick={() => setTimerMode('timer')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      timerMode === 'timer'
                        ? 'bg-cyan-50/70 border-cyan-600 ring-2 ring-cyan-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        <Hourglass className={`w-4 h-4 ${timerMode === 'timer' ? 'text-cyan-600' : 'text-slate-400'}`} />
                        <span>Timer</span>
                      </div>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                        Auto-Submit
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Set custom time. Test auto-submits when time finishes.
                    </p>
                  </button>
                </div>
              </div>

              {/* If Countdown Timer is selected: Custom Time Configuration */}
              {timerMode === 'timer' && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Set Your Custom Time:
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      {timeLimit} Minutes
                    </span>
                  </div>

                  {/* Stepper and Direct Input */}
                  <div className="flex items-center justify-center gap-2 bg-white p-2 rounded-xl border border-amber-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = Math.max(1, timeLimit - 5);
                        setTimeLimit(updated);
                        setCustomMinutesInput(String(updated));
                      }}
                      disabled={timeLimit <= 5}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition disabled:opacity-40 cursor-pointer"
                      title="Subtract 5 minutes"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="600"
                        value={customMinutesInput}
                        onChange={(e) => {
                          setCustomMinutesInput(e.target.value);
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val > 0 && val <= 600) {
                            setTimeLimit(val);
                          }
                        }}
                        className="w-20 px-2 py-1 text-center font-mono font-black text-base bg-amber-50/40 border border-amber-300 rounded-lg text-amber-950 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-xs font-bold text-slate-600">Minutes</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = Math.min(600, timeLimit + 5);
                        setTimeLimit(updated);
                        setCustomMinutesInput(String(updated));
                      }}
                      disabled={timeLimit >= 600}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition disabled:opacity-40 cursor-pointer"
                      title="Add 5 minutes"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quick Preset Duration Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {[10, 15, 20, 25, 30, 45, 60, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          setTimeLimit(mins);
                          setCustomMinutesInput(String(mins));
                        }}
                        className={`px-2 py-0.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                          timeLimit === mins
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-amber-900/90 leading-tight">
                    ⚡ <strong>Auto-submit:</strong> Time khatam hone par test apne aap submit ho jayega.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block">Tab Switch Warning</span>
                    <span className="text-[11px] text-slate-400">Alerts if browser tab is switched</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={antiCheatAlerts}
                    onChange={(e) => setAntiCheatAlerts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Start Button */}
        <div className="mt-2">
          <button
            id="btn-start-exam"
            onClick={handleStart}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-bold text-sm sm:text-base rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            Start Test Sheet
          </button>
        </div>

        {/* Given Mocks & Performance History Section */}
        <section className="mt-4 pt-3 border-t-2 border-slate-200">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800">
                Previous Tests
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold">
                {historyList.length}
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-bold">
                2+ Days Retained
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Hide / Show Section Button */}
              {historyList.length > 0 && (
                <button
                  id="btn-toggle-hide-previous"
                  onClick={toggleHideSection}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title={isSectionHidden ? "Show Previous Tests" : "Hide Previous Tests"}
                >
                  {isSectionHidden ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Show</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                      <span>Hide</span>
                    </>
                  )}
                </button>
              )}

              {historyList.length > 0 && (
                <button
                  onClick={onOpenHistory}
                  className="text-xs text-cyan-700 hover:text-cyan-900 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Previous</span>
                </button>
              )}
            </div>
          </div>

          {isSectionHidden ? (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-600">
                <EyeOff className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-medium">
                  Previous Tests are hidden ({historyList.length} saved safely)
                </span>
              </div>
              <button
                onClick={toggleHideSection}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-600" />
                <span>Show Tests</span>
              </button>
            </div>
          ) : historyList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center shadow-xs">
              <div className="w-10 h-10 mx-auto rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600 mb-2">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700">No previous tests yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Completed tests will be preserved here for at least 2 days under Previous Tests.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {hiddenTestIds.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-xl p-2.5 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    {hiddenTestIds.length} test{hiddenTestIds.length > 1 ? 's' : ''} hidden from home
                  </span>
                  <button
                    onClick={handleUnhideAllTests}
                    className="text-cyan-700 hover:text-cyan-900 font-bold underline cursor-pointer text-xs"
                  >
                    Unhide All
                  </button>
                </div>
              )}

              {historyList.filter(item => !hiddenTestIds.includes(item.id)).length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center shadow-xs">
                  <p className="text-xs font-semibold text-slate-700">All tests are currently hidden</p>
                  <button
                    onClick={handleUnhideAllTests}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-800 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-600" />
                    Unhide All Tests
                  </button>
                </div>
              ) : (
                historyList
                  .filter(item => !hiddenTestIds.includes(item.id))
                  .map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-cyan-300 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900">
                              {item.testName}
                            </h4>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                              Previous
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 font-medium flex items-center gap-1.5 flex-wrap">
                            <span className="text-teal-700 font-semibold">{formatRelativeExamAge(item.date)}</span>
                            <span>•</span>
                            <span className="text-slate-400">
                              {(() => {
                                try {
                                  const d = new Date(item.date);
                                  if (!isNaN(d.getTime())) {
                                    return `${d.toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })} • ${d.toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}`;
                                  }
                                } catch {
                                  // ignore
                                }
                                return item.date || 'Recent';
                              })()}
                            </span>
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-black font-mono text-cyan-700">
                            {((item.score ?? 0)).toFixed(1)}{' '}
                            <span className="text-[11px] text-slate-400 font-normal">/ {((item.maxScore ?? 0)).toFixed(1)}</span>
                          </div>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            (item.percentage ?? 0) >= 70 ? 'bg-emerald-100 text-emerald-800' :
                            (item.percentage ?? 0) >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {(item.percentage ?? 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Stats Badges */}
                      <div className="grid grid-cols-4 gap-1.5 my-3 bg-slate-50 p-2 rounded-xl text-center text-[11px]">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Total</span>
                          <span className="font-bold text-slate-700">{item.totalQ}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-600 block">Correct</span>
                          <span className="font-bold text-emerald-700">+{item.correctCount}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-rose-600 block">Wrong</span>
                          <span className="font-bold text-rose-700">-{item.wrongCount}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Time</span>
                          <span className="font-bold text-slate-700">{formatTime(item.timeTakenSeconds)}</span>
                        </div>
                      </div>

                      {/* Action Buttons: Scorecard & Review Answers & Hide & Delete */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                        <button
                          onClick={() => onSelectHistoryResult?.(item)}
                          className="flex-1 py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold rounded-xl transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Trophy className="w-3.5 h-3.5 text-teal-600" />
                          <span>Scorecard</span>
                        </button>
                        <button
                          onClick={() => onSelectHistoryReview?.(item)}
                          className="flex-1 py-2 px-3 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ListChecks className="w-3.5 h-3.5" />
                          <span>Review Answers</span>
                        </button>

                        {/* Individual Hide Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHideSingleTest(item.id);
                          }}
                          className="py-2 px-2.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 text-xs font-semibold"
                          title="Hide from home screen (remains saved)"
                        >
                          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[11px] font-semibold hidden sm:inline">Hide</span>
                        </button>

                        {onDeleteHistory && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteHistory(item.id);
                              const fresh = getExamHistory();
                              setHistoryList(fresh);
                              setHistoryCount(fresh.length);
                            }}
                            className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition cursor-pointer"
                            title="Delete mock result"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
