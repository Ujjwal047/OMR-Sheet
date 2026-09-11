import { useState } from 'react';
import { TimerMode } from '../types';
import { formatTimeCompact } from '../utils/storage';
import { 
  X, 
  Timer, 
  Hourglass, 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  Clock,
  Plus,
  Minus,
  Sparkles
} from 'lucide-react';

interface TimerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: TimerMode;
  currentElapsedSeconds: number;
  currentRemainingSeconds: number;
  currentTimerLimitMinutes: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onResetTimer: (newMode: TimerMode, newDurationMinutes: number) => void;
  onApplySettings: (mode: TimerMode, durationMinutes: number) => void;
}

const PRESET_MINUTES = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120, 180];

export default function TimerConfigModal({
  isOpen,
  onClose,
  currentMode,
  currentElapsedSeconds,
  currentRemainingSeconds,
  currentTimerLimitMinutes,
  isPaused,
  onTogglePause,
  onResetTimer,
  onApplySettings,
}: TimerConfigModalProps) {
  const [selectedMode, setSelectedMode] = useState<TimerMode>(currentMode);
  const [customMinutes, setCustomMinutes] = useState<number>(currentTimerLimitMinutes || 30);
  const [inputStr, setInputStr] = useState<string>(String(currentTimerLimitMinutes || 30));

  if (!isOpen) return null;

  const handleSelectPreset = (mins: number) => {
    setCustomMinutes(mins);
    setInputStr(String(mins));
  };

  const handleInputChange = (val: string) => {
    setInputStr(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0 && num <= 600) {
      setCustomMinutes(num);
    }
  };

  const adjustMinutes = (delta: number) => {
    const updated = Math.max(1, Math.min(600, customMinutes + delta));
    setCustomMinutes(updated);
    setInputStr(String(updated));
  };

  const handleApply = () => {
    const finalMins = Math.max(1, Math.min(600, customMinutes));
    onApplySettings(selectedMode, finalMins);
    onClose();
  };

  const handleReset = () => {
    const finalMins = Math.max(1, Math.min(600, customMinutes));
    onResetTimer(selectedMode, finalMins);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-700 to-teal-700 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/15">
              <Clock className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Timer & Stopwatch Settings
              </h3>
              <p className="text-[11px] text-cyan-100">
                टाइमर या स्टॉपवॉच चुनें और अपना समय सेट करें
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Current Status Bar */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentMode === 'stopwatch' ? (
                <Timer className="w-4 h-4 text-cyan-600" />
              ) : (
                <Hourglass className="w-4 h-4 text-amber-600" />
              )}
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">
                  Active Mode: <strong className="text-slate-800 uppercase">{currentMode}</strong>
                </span>
                <span className="font-mono text-base font-bold text-slate-800">
                  {currentMode === 'stopwatch' 
                    ? formatTimeCompact(currentElapsedSeconds) 
                    : `${formatTimeCompact(currentRemainingSeconds)} left`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onTogglePause}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  isPaused 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                }`}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition flex items-center gap-1 cursor-pointer"
                title="Reset time"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Mode Selector (Mutually Exclusive: Stopwatch vs Timer) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Choose Test Timing Mode:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Mode 1: Stopwatch */}
              <button
                type="button"
                onClick={() => setSelectedMode('stopwatch')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  selectedMode === 'stopwatch'
                    ? 'bg-cyan-50/70 border-cyan-600 ring-2 ring-cyan-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <Timer className={`w-4 h-4 ${selectedMode === 'stopwatch' ? 'text-cyan-600' : 'text-slate-400'}`} />
                    <span>Stopwatch</span>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                    Default
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Counts up (00:00 &rarr;). No time limit. Submit whenever ready.
                </p>
              </button>

              {/* Mode 2: Countdown Timer */}
              <button
                type="button"
                onClick={() => setSelectedMode('timer')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  selectedMode === 'timer'
                    ? 'bg-cyan-50/70 border-cyan-600 ring-2 ring-cyan-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <Hourglass className={`w-4 h-4 ${selectedMode === 'timer' ? 'text-cyan-600' : 'text-slate-400'}`} />
                    <span>Countdown Timer</span>
                  </div>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                    Auto-Submit
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Counts down. Exam auto-submits when time reaches 00:00.
                </p>
              </button>
            </div>
          </div>

          {/* If Countdown Timer is selected: Custom Time Configuration */}
          {selectedMode === 'timer' && (
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3.5 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Set Custom Time Duration:
                </span>
                <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  {customMinutes} Minutes ({formatTimeCompact(customMinutes * 60)})
                </span>
              </div>

              {/* Direct Custom Number Input */}
              <div className="flex items-center justify-center gap-2 bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => adjustMinutes(-5)}
                  disabled={customMinutes <= 5}
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
                    value={inputStr}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="w-20 px-2 py-1.5 text-center font-mono font-black text-lg bg-amber-50/40 border border-amber-300 rounded-lg text-amber-950 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-slate-600">Minutes</span>
                </div>

                <button
                  type="button"
                  onClick={() => adjustMinutes(5)}
                  disabled={customMinutes >= 600}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition disabled:opacity-40 cursor-pointer"
                  title="Add 5 minutes"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-500 font-medium block">
                  Quick Choices:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_MINUTES.map((mins) => {
                    const isSelected = customMinutes === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => handleSelectPreset(mins)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition border cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        {mins}m
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto-Submit Notice */}
              <div className="text-[11px] text-amber-900 bg-amber-100/60 p-2 rounded-lg border border-amber-200/60 leading-tight">
                ⚡ <strong>Auto-Submit Note:</strong> When timer reaches 00:00, all answered questions will be automatically saved and submitted.
              </div>
            </div>
          )}

          {selectedMode === 'stopwatch' && (
            <div className="bg-cyan-50/60 border border-cyan-200 rounded-xl p-3 text-xs text-cyan-950 space-y-1">
              <span className="font-bold flex items-center gap-1 text-cyan-900">
                <Timer className="w-3.5 h-3.5 text-cyan-700" />
                Stopwatch Mode Active:
              </span>
              <p className="text-[11px] text-cyan-800">
                • The stopwatch will count up continuously without any time limit.
              </p>
              <p className="text-[11px] text-cyan-800">
                • You can pause or resume at any time, and submit whenever you finish.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Apply {selectedMode === 'timer' ? `Timer (${customMinutes}m)` : 'Stopwatch'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
