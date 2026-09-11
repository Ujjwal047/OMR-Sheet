import { useState, useEffect, useRef } from 'react';
import { Section, TimerMode } from '../types';
import { ALPHABETS, formatTime, formatTimeCompact, playTimesUpSound, getExamBackup, saveExamBackup } from '../utils/storage';
import SmartFillModal from './SmartFillModal';
import TimerConfigModal from './TimerConfigModal';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Flag, 
  CircleDot, 
  SquareCheck, 
  Filter, 
  Pause, 
  Play, 
  Layers,
  Sparkles,
  CheckCircle2,
  ClipboardPaste,
  Camera,
  Timer,
  Hourglass,
  Clock,
  ArrowRight
} from 'lucide-react';

interface TestScreenProps {
  testName: string;
  sections: Section[];
  userAnswers: Record<number, string>;
  initialSeconds?: number;
  initialTimerMode?: TimerMode;
  initialTimeLimitMinutes?: number;
  antiCheatAlerts?: boolean;
  onAddSection: (count: number, options: number, name?: string) => void;
  onSelectOption: (qIndex: number, opt: string) => void;
  onClearOption: (qIndex: number) => void;
  onBatchSetAnswers?: (answers: Record<number, string>) => void;
  onSubmit: (totalSeconds: number, isAutoSubmit?: boolean) => void;
  onBack: (seconds?: number) => void;
}

export default function TestScreen({
  testName,
  sections,
  userAnswers,
  initialSeconds = 0,
  initialTimerMode = 'stopwatch',
  initialTimeLimitMinutes,
  antiCheatAlerts = true,
  onAddSection,
  onSelectOption,
  onClearOption,
  onBatchSetAnswers,
  onSubmit,
  onBack,
}: TestScreenProps) {
  const [showSmartModal, setShowSmartModal] = useState<boolean>(false);
  
  // Dual-mode Timer & Stopwatch state (Default: stopwatch)
  const [timerMode, setTimerMode] = useState<TimerMode>(initialTimerMode || 'stopwatch');
  const [timerDurationMinutes, setTimerDurationMinutes] = useState<number>(initialTimeLimitMinutes || 30);
  const [seconds, setSeconds] = useState<number>(initialSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (initialTimerMode === 'timer' && initialTimeLimitMinutes) {
      return Math.max(0, initialTimeLimitMinutes * 60 - initialSeconds);
    }
    return (initialTimeLimitMinutes || 30) * 60;
  });
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showTimerModal, setShowTimerModal] = useState<boolean>(false);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);

  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [showTabWarning, setShowTabWarning] = useState<boolean>(false);

  // Quick Add bar state
  const [quickQty, setQuickQty] = useState<string>('10');
  const [quickOpts, setQuickOpts] = useState<string>('4');

  // Filter & Display mode state
  const [filterMode, setFilterMode] = useState<'all' | 'unanswered' | 'flagged'>('all');
  const [flaggedQs, setFlaggedQs] = useState<Record<number, boolean>>({});
  const [bubbleStyle, setBubbleStyle] = useState<'bubbles' | 'boxes'>('boxes'); // Boxes by default

  const timerRef = useRef<number | null>(null);

  // Calculate total questions
  const totalQ = sections.reduce((sum, s) => sum + s.count, 0);
  const answeredCount = Object.keys(userAnswers).filter(k => parseInt(k) <= totalQ).length;
  const leftCount = Math.max(0, totalQ - answeredCount);
  const flaggedCount = Object.values(flaggedQs).filter(Boolean).length;

  // Stopwatch / Countdown Timer effect (Mutually exclusive modes)
  useEffect(() => {
    if (isPaused || isTimeUp) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setSeconds(prev => prev + 1);

      if (timerMode === 'timer') {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsTimeUp(true);
            playTimesUpSound();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, isTimeUp, timerMode]);

  // When Time is Up: Auto-submit test after brief alert
  const handleConfirmTimeUpSubmit = () => {
    setIsTimeUp(false);
    onSubmit(seconds, true);
  };

  useEffect(() => {
    if (isTimeUp) {
      const timeout = setTimeout(() => {
        handleConfirmTimeUpSubmit();
      }, 2600);
      return () => clearTimeout(timeout);
    }
  }, [isTimeUp, seconds]);

  const handleApplyTimerSettings = (newMode: TimerMode, newDurationMinutes: number) => {
    setTimerMode(newMode);
    setTimerDurationMinutes(newDurationMinutes);
    if (newMode === 'timer') {
      setRemainingSeconds(newDurationMinutes * 60);
      setIsTimeUp(false);
    }
  };

  const handleResetTimer = (mode: TimerMode, durationMins: number) => {
    if (mode === 'stopwatch') {
      setSeconds(0);
    } else {
      setRemainingSeconds(durationMins * 60);
      setIsTimeUp(false);
    }
  };

  // Sync elapsed seconds to backup in background every 5 seconds
  useEffect(() => {
    const backupInterval = window.setInterval(() => {
      const backup = getExamBackup();
      if (backup) {
        saveExamBackup({
          ...backup,
          totalSeconds: seconds,
          lastSaved: Date.now(),
        });
      }
    }, 5000);
    return () => clearInterval(backupInterval);
  }, [seconds]);

  // Tab switch listener
  useEffect(() => {
    if (!antiCheatAlerts) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1);
        setShowTabWarning(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [antiCheatAlerts]);

  const [addError, setAddError] = useState<string | null>(null);

  const handleQuickAdd = () => {
    setAddError(null);
    const qty = parseInt(quickQty);
    const opts = parseInt(quickOpts) || 4;
    if (isNaN(qty) || qty <= 0) {
      setAddError('Please enter a valid quantity (e.g. 10 or 25).');
      return;
    }
    if (isNaN(opts) || opts < 2 || opts > 10) {
      setAddError('Options must be between 2 and 10.');
      return;
    }

    onAddSection(qty, opts, `Section ${sections.length + 1}`);
    setQuickQty('');
  };

  const toggleFlag = (qIndex: number) => {
    setFlaggedQs(prev => ({
      ...prev,
      [qIndex]: !prev[qIndex],
    }));
  };

  return (
    <div id="screen-test" className="max-w-xl mx-auto min-h-screen bg-slate-100 flex flex-col pb-24 select-none">
      {/* Top Header */}
      <header className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white px-3.5 py-3 shadow-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => onBack(seconds)}
            className="p-1.5 rounded-lg bg-black/15 hover:bg-black/25 text-white transition active:scale-95 shrink-0"
            title="Return to Setup"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <span className="font-bold text-sm sm:text-base truncate block text-white/95 display-testname">
              {testName}
            </span>
            <span className="text-[10px] text-cyan-100 font-medium block">
              {answeredCount}/{totalQ} Answered
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSmartModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-xs transition active:scale-95 border border-white/20 cursor-pointer"
            title="Fast paste or scan answers with camera/Lens"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <Camera className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Paste / Scan</span>
          </button>

          {/* Interactive Dual-Mode Timer / Stopwatch Display */}
          <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-xs px-2 sm:px-2.5 py-1 rounded-xl border border-white/20 shadow-xs">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1 hover:bg-white/15 rounded-lg transition text-cyan-100 hover:text-white cursor-pointer"
              title={isPaused ? "Resume Timer" : "Pause Timer"}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-current text-amber-300" /> : <Pause className="w-3.5 h-3.5" />}
            </button>

            <button
              id="btn-timer-display"
              onClick={() => setShowTimerModal(true)}
              className="flex items-center gap-1.5 hover:bg-white/10 px-1 py-0.5 rounded-lg transition cursor-pointer text-left group"
              title="Tap to switch between Stopwatch & Timer or set custom time"
            >
              {timerMode === 'stopwatch' ? (
                <>
                  <Timer className="w-3.5 h-3.5 text-cyan-200 group-hover:text-white transition" />
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase font-bold text-cyan-200/90 leading-none">
                      Stopwatch
                    </span>
                    <span 
                      id="test-timer"
                      className={`font-mono text-xs sm:text-sm font-bold tracking-wider leading-tight ${
                        isPaused ? 'text-amber-300 animate-pulse' : 'text-white'
                      }`}
                    >
                      {formatTimeCompact(seconds)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <Hourglass className={`w-3.5 h-3.5 transition ${
                    remainingSeconds <= 60 
                      ? 'text-rose-300 animate-bounce' 
                      : remainingSeconds <= 300 
                      ? 'text-amber-300' 
                      : 'text-cyan-200 group-hover:text-white'
                  }`} />
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase font-bold text-cyan-200/90 leading-none">
                      Timer Left
                    </span>
                    <span 
                      id="test-timer"
                      className={`font-mono text-xs sm:text-sm font-bold tracking-wider leading-tight ${
                        remainingSeconds <= 60 
                          ? 'text-rose-300 font-extrabold animate-pulse' 
                          : remainingSeconds <= 300 
                          ? 'text-amber-300 font-extrabold' 
                          : isPaused 
                          ? 'text-amber-200 animate-pulse' 
                          : 'text-white'
                      }`}
                    >
                      {formatTimeCompact(remainingSeconds)}
                    </span>
                  </div>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Tab Switch Warning Toast */}
      {showTabWarning && (
        <div className="bg-rose-500 text-white text-xs px-4 py-2 flex items-center justify-between shadow-md animate-in slide-in-from-top duration-200">
          <span className="font-semibold flex items-center gap-1.5">
            ⚠️ Tab switched! Focus on your test. (Count: {tabSwitchCount})
          </span>
          <button 
            onClick={() => setShowTabWarning(false)}
            className="text-[11px] bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Dynamic On-The-Fly Question Builder Bar */}
      <div className="bg-white border-b border-slate-200 px-3.5 py-2.5 shadow-xs sticky top-[57px] z-20">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Add Qty
            </label>
            <input
              type="number"
              id="quick-add-q"
              placeholder="e.g. 10"
              min="1"
              value={quickQty}
              onChange={(e) => {
                setQuickQty(e.target.value);
                if (addError) setAddError(null);
              }}
              className="w-full px-2.5 py-1.5 text-center font-bold text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="w-24">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Options
            </label>
            <input
              type="number"
              id="quick-add-opt"
              placeholder="4"
              min="2"
              max="10"
              value={quickOpts}
              onChange={(e) => setQuickOpts(e.target.value)}
              className="w-full px-2 py-1.5 text-center font-bold text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <button
            id="btn-quick-add"
            onClick={handleQuickAdd}
            className="h-[35px] px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
        {addError && (
          <p className="text-[11px] font-semibold text-rose-600 mt-1.5 animate-in fade-in">
            {addError}
          </p>
        )}
      </div>

      {/* Sub-header & Filter / Style Control */}
      <div className="bg-cyan-50/80 border-b border-cyan-200/60 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-cyan-900">
        <div className="flex items-center gap-2">
          <span className="text-slate-600 font-medium">Progress:</span>
          <span 
            id="test-left"
            className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-bold text-xs"
          >
            {leftCount} Left
          </span>
          <span className="text-slate-400">&bull;</span>
          <span className="text-emerald-700 font-bold">{answeredCount} done</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Bubble style toggle */}
          <button
            onClick={() => setBubbleStyle(b => b === 'bubbles' ? 'boxes' : 'bubbles')}
            className="px-2 py-1 bg-white hover:bg-slate-50 border border-cyan-200 rounded text-[11px] text-cyan-800 flex items-center gap-1 font-medium transition"
            title="Toggle between physical circular bubbles and box styles"
          >
            {bubbleStyle === 'bubbles' ? (
              <>
                <CircleDot className="w-3.5 h-3.5 text-cyan-600" />
                <span>Bubbles</span>
              </>
            ) : (
              <>
                <SquareCheck className="w-3.5 h-3.5 text-cyan-600" />
                <span>Boxes</span>
              </>
            )}
          </button>

          {/* Filter tabs */}
          <div className="flex bg-white rounded-lg p-0.5 border border-cyan-200 text-[11px]">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2 py-0.5 rounded-md transition ${filterMode === 'all' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('unanswered')}
              className={`px-2 py-0.5 rounded-md transition ${filterMode === 'unanswered' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Left ({leftCount})
            </button>
            {flaggedCount > 0 && (
              <button
                onClick={() => setFilterMode('flagged')}
                className={`px-2 py-0.5 rounded-md transition flex items-center gap-0.5 ${filterMode === 'flagged' ? 'bg-cyan-600 text-white font-bold' : 'text-indigo-600 hover:text-indigo-900'}`}
              >
                <Flag className="w-3 h-3" />
                <span>{flaggedCount}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Question List */}
      <main className="p-3 space-y-4 flex-1">
        {sections.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-teal-300 p-6 sm:p-8 text-center my-4 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Fresh Mock Test (0 Questions)</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Aap apne hisab se jitne chahein questions add kar sakte hain. Upar diye bar se custom quantity add karein ya quick options chunein:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => onAddSection(10, 4, 'Section 1')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                +10 Questions
              </button>
              <button
                onClick={() => onAddSection(25, 4, 'Section 1')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                +25 Questions
              </button>
              <button
                onClick={() => onAddSection(50, 4, 'Section 1')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                +50 Questions
              </button>
              <button
                onClick={() => onAddSection(100, 4, 'Section 1')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                +100 Questions
              </button>
            </div>
          </div>
        ) : (
          sections.map((sec, secIdx) => {
            // Generate rows for this section
            const questionRows = [];
            for (let i = 1; i <= sec.count; i++) {
              const absIndex = sec.startIdx + i - 1;
              const isAnswered = !!userAnswers[absIndex];
              const isFlagged = !!flaggedQs[absIndex];

              // Filtering logic
              if (filterMode === 'unanswered' && isAnswered) continue;
              if (filterMode === 'flagged' && !isFlagged) continue;

              const currentAns = userAnswers[absIndex];

              questionRows.push(
                <div
                  key={absIndex}
                  id={`test-row-${absIndex}`}
                  className={`bg-white rounded-xl p-2.5 sm:p-3 border transition-all shadow-xs flex items-center gap-2 sm:gap-3 relative ${
                    isAnswered 
                      ? 'border-emerald-200 ring-1 ring-emerald-500/20 bg-emerald-50/10' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Left answered stripe indicator */}
                  {isAnswered && (
                    <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-emerald-500 rounded-r" />
                  )}

                  {/* Question Number & Flag */}
                  <div className="flex flex-col items-center justify-center min-w-[36px] shrink-0">
                    <span className="font-extrabold text-sm sm:text-base text-cyan-800 font-mono leading-none">
                      {i}
                    </span>
                    <button
                      onClick={() => toggleFlag(absIndex)}
                      className={`mt-1 p-0.5 transition ${isFlagged ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-400'}`}
                      title={isFlagged ? "Flagged for review" : "Flag question"}
                    >
                      <Flag className={`w-3 h-3 ${isFlagged ? 'fill-indigo-600' : ''}`} />
                    </button>
                  </div>

                  {/* Options Bubble or Box Set */}
                  <div className="flex-1 flex items-center gap-1.5 sm:gap-2">
                    {bubbleStyle === 'bubbles' ? (
                      // Real Physical OMR Bubble aesthetic (circular with dark pen fill)
                      <div className="flex-1 flex items-center justify-around gap-1">
                        {Array.from({ length: sec.optionsCount }).map((_, optIdx) => {
                          const letter = ALPHABETS[optIdx] || `${optIdx + 1}`;
                          const isSelected = currentAns === letter;

                          return (
                            <button
                              key={letter}
                              id={`test-opt-${absIndex}-${letter}`}
                              onClick={() => {
                                if (currentAns) return; // Locked once filled! Must click Clear to change
                                onSelectOption(absIndex, letter);
                              }}
                              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center border-2 transition-all select-none omr-bubble-fill ${
                                currentAns && !isSelected
                                  ? 'opacity-60 cursor-not-allowed bg-white border-slate-300 text-slate-400'
                                  : isSelected
                                  ? 'bg-slate-900 border-slate-950 text-white shadow-inner ring-2 ring-slate-400/40'
                                  : 'bg-white border-slate-700 text-slate-800 hover:bg-slate-100 hover:border-slate-900 cursor-pointer active:scale-90'
                              }`}
                            >
                              {letter}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      // Prototype Box Grid Style (like the original HTML prototype: black solid box when selected)
                      <div className="flex-1 flex border-2 border-slate-900 rounded-md overflow-hidden">
                        {Array.from({ length: sec.optionsCount }).map((_, optIdx) => {
                          const letter = ALPHABETS[optIdx] || `${optIdx + 1}`;
                          const isSelected = currentAns === letter;

                          return (
                            <button
                              key={letter}
                              id={`test-opt-${absIndex}-${letter}`}
                              onClick={() => {
                                if (currentAns) return; // Locked once filled! Must click Clear to change
                                onSelectOption(absIndex, letter);
                              }}
                              className={`flex-1 py-2 text-center font-bold text-xs sm:text-sm border-r-2 last:border-r-0 border-slate-900 transition-colors ${
                                currentAns && !isSelected
                                  ? 'bg-white text-slate-400 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-slate-900 text-white font-extrabold'
                                  : 'bg-white text-slate-900 hover:bg-slate-100 cursor-pointer'
                              }`}
                            >
                              {letter}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Clear Button */}
                    <button
                      onClick={() => onClearOption(absIndex)}
                      disabled={!isAnswered}
                      className={`px-2 py-1.5 rounded text-[11px] font-bold transition shrink-0 ${
                        isAnswered
                          ? 'text-rose-600 hover:bg-rose-50 active:scale-95 border border-rose-200'
                          : 'text-slate-300 cursor-not-allowed'
                      }`}
                      title="Clear Response"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              );
            }

            if (questionRows.length === 0 && filterMode !== 'all') {
              return null;
            }

            return (
              <div key={sec.id} className="space-y-2">
                {/* Section Divider Header */}
                <div className="section-header bg-slate-200/90 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase flex items-center justify-between border border-slate-300">
                  <span>{sec.name} ({sec.count} Questions, {sec.optionsCount} Options)</span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Q{sec.startIdx} - Q{sec.startIdx + sec.count - 1}
                  </span>
                </div>

                <div className="space-y-2">
                  {questionRows}
                </div>

                {/* Fat horizontal black line below every section */}
                <div 
                  className="w-full my-4 border-b-[4px] border-black" 
                  style={{ borderBottom: '4px solid #000000' }} 
                />
              </div>
            );
          })
        )}
      </main>

      {/* Smart Fill & Camera/Lens Modal */}
      <SmartFillModal
        isOpen={showSmartModal}
        onClose={() => setShowSmartModal(false)}
        onApplyAnswers={(answers) => onBatchSetAnswers?.(answers)}
        totalQ={totalQ}
        sections={sections}
        title="Test Sheet: Smart Paste & Lens"
        isAnswerKey={false}
      />

      {/* Dual-Mode Timer & Stopwatch Settings Modal */}
      <TimerConfigModal
        isOpen={showTimerModal}
        onClose={() => setShowTimerModal(false)}
        currentMode={timerMode}
        currentElapsedSeconds={seconds}
        currentRemainingSeconds={remainingSeconds}
        currentTimerLimitMinutes={timerDurationMinutes}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused(!isPaused)}
        onResetTimer={handleResetTimer}
        onApplySettings={handleApplyTimerSettings}
      />

      {/* Auto-Submit On Time Expiry Overlay */}
      {isTimeUp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border-2 border-rose-500 overflow-hidden text-center p-5 space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 border-2 border-rose-200 flex items-center justify-center mx-auto animate-bounce">
              <Clock className="w-8 h-8 text-rose-600" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 leading-tight">
                Time&apos;s Up!
              </h3>
              <p className="text-sm font-bold text-rose-600 mt-0.5">
                समय समाप्त हो गया है!
              </p>
              <p className="text-xs text-slate-600 mt-2">
                Your test duration has ended. All your marked answers have been locked and submitted automatically.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 flex justify-around">
              <div>
                <span className="text-slate-400 block text-[10px]">Answered</span>
                <span className="text-base font-bold text-teal-700">{answeredCount}/{totalQ}</span>
              </div>
              <div className="border-l border-slate-200" />
              <div>
                <span className="text-slate-400 block text-[10px]">Time Allotted</span>
                <span className="text-base font-bold text-slate-800">{timerDurationMinutes}m</span>
              </div>
            </div>

            <button
              onClick={handleConfirmTimeUpSubmit}
              className="w-full py-3 px-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 text-sm active:scale-95"
            >
              <span>Proceed to Answer Key (आगे बढ़ें)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Floating Bar */}
      <footer className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg z-30">
        <button
          id="btn-submit-exam"
          onClick={() => onSubmit(seconds)}
          disabled={totalQ === 0}
          className={`w-full py-3 px-4 rounded-xl font-bold text-sm sm:text-base transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 ${
            totalQ > 0
              ? 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <CheckCircle2 className="w-5 h-5" />
          Submit Test ({answeredCount}/{totalQ})
        </button>
      </footer>
    </div>
  );
}
