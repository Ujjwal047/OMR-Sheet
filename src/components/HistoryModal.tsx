import { ExamResult } from '../types';
import { formatTime, formatRelativeExamAge } from '../utils/storage';
import { History, Trash2, ArrowRight, Trophy, X, Calendar, Clock, Target, ShieldCheck } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  history: ExamResult[];
  onSelectResult: (result: ExamResult) => void;
  onDeleteResult: (id: string) => void;
  onClose: () => void;
}

export default function HistoryModal({
  isOpen,
  history,
  onSelectResult,
  onDeleteResult,
  onClose,
}: HistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-200" />
              <h3 className="font-bold text-base">Previous Tests ({history.length})</h3>
            </div>
            <p className="text-xs text-cyan-100 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-200" />
              Tests remain saved in app for at least 2 days
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto divide-y divide-slate-100 flex-1">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <History className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">No previous tests saved yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Completed exams are preserved here under Previous Tests for at least 2 days.
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="py-3 px-2 hover:bg-slate-50 rounded-xl transition flex items-center justify-between gap-3 group"
              >
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => onSelectResult(item)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800 group-hover:text-cyan-700 transition">
                      {item.testName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                      {(item.score ?? 0).toFixed(1)} / {(item.maxScore ?? 0).toFixed(1)}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                      Previous
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1 font-medium">
                    <span className="text-teal-700 font-semibold">
                      {formatRelativeExamAge(item.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {item.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatTime(item.timeTakenSeconds)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-slate-400" />
                      {(item.accuracy ?? 0).toFixed(0)}% acc
                    </span>
                    <span>
                      {item.correctCount}✔ {item.wrongCount}✖ {item.naCount}—
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onDeleteResult(item.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg transition"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onSelectResult(item)}
                    className="p-1.5 text-cyan-600 hover:bg-cyan-50 rounded-lg transition"
                    title="View Report"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
