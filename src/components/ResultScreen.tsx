import { useState, useEffect, useRef } from 'react';
import { ExamResult } from '../types';
import { formatTime } from '../utils/storage';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Clock, 
  Percent, 
  Target, 
  ListChecks, 
  RotateCcw, 
  Printer, 
  Share2,
  Award,
  Play,
  Edit3
} from 'lucide-react';

interface ResultScreenProps {
  result: ExamResult;
  onReviewAnswers: () => void;
  onFinishExam: () => void;
  onStartNextMock?: (customName?: string) => void;
  nextMockName?: string;
}

export default function ResultScreen({
  result,
  onReviewAnswers,
  onFinishExam,
  onStartNextMock,
  nextMockName,
}: ResultScreenProps) {
  const chartDrawn = useRef(false);
  const [customMockName, setCustomMockName] = useState(nextMockName || 'Mock Test');

  useEffect(() => {
    if (nextMockName) {
      setCustomMockName(nextMockName);
    }
  }, [nextMockName]);

  useEffect(() => {
    // Fire celebratory confetti if score percentage is >= 70%
    if (result.percentage >= 70 && !chartDrawn.current) {
      chartDrawn.current = true;
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Safe fallback
      }
    }
  }, [result.percentage]);

  const attemptedCount = result.correctCount + result.wrongCount;
  const avgSecondsPerQ = attemptedCount > 0 
    ? Math.round(result.timeTakenSeconds / attemptedCount) 
    : 0;

  // Pie/Donut Chart calculations
  const total = result.totalQ || 1;
  const correctPct = (result.correctCount / total) * 100;
  const wrongPct = (result.wrongCount / total) * 100;
  const naPct = (result.naCount / total) * 100;

  // SVG Donut calculation
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashCorrect = (result.correctCount / total) * circumference;
  const strokeDashWrong = (result.wrongCount / total) * circumference;
  const strokeDashNA = (result.naCount / total) * circumference;

  const correctOffset = 0;
  const wrongOffset = -strokeDashCorrect;
  const naOffset = -(strokeDashCorrect + strokeDashWrong);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="screen-result" className="max-w-xl mx-auto min-h-screen bg-slate-100 flex flex-col pb-12">
      {/* Header */}
      <header className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white px-4 py-3.5 shadow-md flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/15 backdrop-blur-xs">
            <Trophy className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <span className="font-bold text-base block text-white/95 display-testname">
              Scorecard: {result.testName}
            </span>
            <span className="text-[11px] text-cyan-100 font-medium block">
              Evaluated on {result.date}
            </span>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="no-print p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white transition active:scale-95 text-xs font-semibold flex items-center gap-1.5"
          title="Print or Save PDF"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden sm:inline">Print</span>
        </button>
      </header>

      <main className="p-4 sm:p-5 flex-1 flex flex-col gap-4">
        {/* Main Score Hero Card */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
          <div className="bg-gradient-to-br from-cyan-600 to-teal-700 text-white p-6 text-center relative">
            <span className="text-xs uppercase tracking-widest font-bold text-cyan-200 block mb-1">
              Final Net Score
            </span>
            <div 
              id="res-title"
              className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-white"
            >
              {(result.score ?? 0).toFixed(1)} <span className="text-xl sm:text-2xl font-normal text-cyan-200">/ {(result.maxScore ?? 0).toFixed(1)}</span>
            </div>

            <div className="flex items-center justify-center gap-3 mt-3">
              <span 
                id="res-perc"
                className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold"
              >
                {(result.percentage ?? 0).toFixed(1)}% Score
              </span>
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-amber-300" />
                {(result.accuracy ?? 0).toFixed(1)}% Accuracy
              </span>
            </div>
          </div>

          {/* Interactive Donut Chart */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-around gap-4 bg-slate-50/50">
            {/* SVG Donut */}
            <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
                {/* Background Track */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#e2e8f0"
                  strokeWidth="18"
                  fill="transparent"
                />
                {/* Correct Segment */}
                {result.correctCount > 0 && (
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="#10b981"
                    strokeWidth="18"
                    strokeDasharray={`${strokeDashCorrect} ${circumference}`}
                    strokeDashoffset={correctOffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-500"
                  />
                )}
                {/* Wrong Segment */}
                {result.wrongCount > 0 && (
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="#ef4444"
                    strokeWidth="18"
                    strokeDasharray={`${strokeDashWrong} ${circumference}`}
                    strokeDashoffset={wrongOffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-500"
                  />
                )}
                {/* Not Attempted Segment */}
                {result.naCount > 0 && (
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="#94a3b8"
                    strokeWidth="18"
                    strokeDasharray={`${strokeDashNA} ${circumference}`}
                    strokeDashoffset={naOffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-500"
                  />
                )}
              </svg>

              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xl font-extrabold text-slate-800 font-mono leading-none">
                  {result.totalQ}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                  Questions
                </span>
              </div>
            </div>

            {/* Legend & Breakdown */}
            <div className="space-y-2.5 w-full max-w-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-900">Correct Answers</span>
                </div>
                <div className="flex items-center gap-2">
                  <span id="res-correct" className="text-xs font-extrabold text-emerald-700 font-mono">
                    {result.correctCount ?? 0}
                  </span>
                  <span className="text-[10px] text-emerald-600/80 font-semibold font-mono">
                    (+{((result.correctCount ?? 0) * (result.correctMark ?? 0)).toFixed(1)})
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/70 border border-rose-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-xs font-semibold text-rose-900">Wrong Answers</span>
                </div>
                <div className="flex items-center gap-2">
                  <span id="res-wrong" className="text-xs font-extrabold text-rose-700 font-mono">
                    {result.wrongCount ?? 0}
                  </span>
                  <span className="text-[10px] text-rose-600/80 font-semibold font-mono">
                    (-{((result.wrongCount ?? 0) * (result.negativeMark ?? 0)).toFixed(1)})
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100/70 border border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-400" />
                  <span className="text-xs font-semibold text-slate-700">Not Attempted</span>
                </div>
                <span id="res-na" className="text-xs font-extrabold text-slate-700 font-mono">
                  {result.naCount ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Metric Rows (matching user prototype table requirements) */}
          <div className="divide-y divide-slate-100 text-xs">
            <div className="flex justify-between items-center py-2.5 px-4 bg-slate-50/30">
              <span className="text-slate-600 font-medium">Total Questions</span>
              <span id="res-total" className="font-bold text-slate-900 font-mono">{result.totalQ ?? 0}</span>
            </div>
            <div className="flex justify-between items-center py-2.5 px-4 bg-white">
              <span className="text-slate-600 font-medium">Maximum Possible Score</span>
              <span id="res-max" className="font-bold text-slate-900 font-mono">{((result.maxScore ?? 0)).toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center py-2.5 px-4 bg-slate-50/30">
              <span className="text-slate-600 font-medium">Marking Scheme</span>
              <span className="font-bold text-slate-800 font-mono">+{result.correctMark} / -{result.negativeMark}</span>
            </div>
            <div className="flex justify-between items-center py-2.5 px-4 bg-white">
              <span className="text-slate-600 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Time Spent
              </span>
              <span className="font-bold text-slate-900 font-mono">{formatTime(result.timeTakenSeconds)}</span>
            </div>
            {avgSecondsPerQ > 0 && (
              <div className="flex justify-between items-center py-2.5 px-4 bg-slate-50/30">
                <span className="text-slate-600 font-medium">Average Pace</span>
                <span className="font-bold text-slate-800 font-mono">{avgSecondsPerQ}s per attempted question</span>
              </div>
            )}
          </div>
        </section>

        {/* Next Mock Pipeline Card */}
        {onStartNextMock && (
          <div className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-wider">
                  Next in Series
                </span>
                <span className="text-[11px] text-teal-100 flex items-center gap-1 font-medium">
                  <Edit3 className="w-3 h-3" /> Custom Name Allowed
                </span>
              </div>

              {/* Editable Name Field */}
              <div className="mt-2 relative max-w-sm">
                <input
                  type="text"
                  value={customMockName}
                  onChange={(e) => setCustomMockName(e.target.value)}
                  placeholder="Enter test name (e.g. Mock Test 3)..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white/15 hover:bg-white/20 focus:bg-white/25 border border-white/30 focus:border-white rounded-xl text-white font-black text-sm placeholder:text-teal-200/60 outline-hidden transition shadow-inner"
                />
                <Edit3 className="w-3.5 h-3.5 text-teal-200 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <p className="text-[11px] text-teal-100 mt-1.5">
                Keep the default name or type your custom mock name above before starting.
              </p>
            </div>

            <button
              onClick={() => onStartNextMock(customMockName.trim() || nextMockName)}
              className="w-full sm:w-auto px-5 py-3 bg-white text-teal-900 hover:bg-teal-50 font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Play className="w-4 h-4 fill-teal-800 text-teal-800" />
              <span>Start {customMockName.trim() || nextMockName || 'Next Mock'}</span>
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 no-print">
          <button
            onClick={onFinishExam}
            className="py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            Home / New Test
          </button>

          <button
            onClick={onReviewAnswers}
            className="py-3 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ListChecks className="w-4 h-4" />
            Review Answers
          </button>
        </div>
      </main>
    </div>
  );
}
