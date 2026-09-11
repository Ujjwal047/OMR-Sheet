import { AlertTriangle, CheckCircle2, Flag, Clock } from 'lucide-react';
import { formatTime } from '../utils/storage';

interface SubmitModalProps {
  isOpen: boolean;
  totalQ: number;
  answeredCount: number;
  flaggedCount: number;
  elapsedSeconds: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function SubmitModal({
  isOpen,
  totalQ,
  answeredCount,
  flaggedCount,
  elapsedSeconds,
  onCancel,
  onConfirm,
}: SubmitModalProps) {
  if (!isOpen) return null;

  const unanswered = Math.max(0, totalQ - answeredCount);

  return (
    <div 
      id="modal-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity"
    >
      <div 
        id="modal-box"
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="p-5 sm:p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6 text-cyan-600" />
          </div>

          <h3 className="text-lg font-bold text-slate-900">Submit Exam Sheet?</h3>
          <p className="text-xs text-slate-500 mt-1">
            Once submitted, your responses are locked and you will proceed to enter or verify the Answer Key.
          </p>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 my-4 border border-slate-100 text-center">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block uppercase">Answered</span>
              <span className="text-base font-extrabold text-emerald-600">{answeredCount}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block uppercase">Unanswered</span>
              <span className="text-base font-extrabold text-amber-600">{unanswered}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block uppercase">Time</span>
              <span className="text-xs font-mono font-bold text-slate-700 block mt-1">{formatTime(elapsedSeconds)}</span>
            </div>
          </div>

          {unanswered > 0 && (
            <div className="text-xs text-amber-800 bg-amber-50 rounded-lg p-2.5 mb-4 border border-amber-200/80 text-left flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>You still have <strong>{unanswered} question{unanswered > 1 ? 's' : ''}</strong> left unanswered. Are you sure you want to submit?</span>
            </div>
          )}

          {flaggedCount > 0 && (
            <div className="text-xs text-indigo-800 bg-indigo-50 rounded-lg p-2 mb-4 border border-indigo-200 text-left flex items-center gap-2">
              <Flag className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>You have <strong>{flaggedCount} marked for review</strong>.</span>
            </div>
          )}

          <div className="flex gap-2.5">
            <button
              id="modal-cancel-btn"
              onClick={onCancel}
              className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition active:scale-95"
            >
              Keep Answering
            </button>
            <button
              id="modal-confirm-btn"
              onClick={onConfirm}
              className="flex-1 py-2.5 px-3 bg-cyan-600 hover:bg-cyan-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Yes, Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
