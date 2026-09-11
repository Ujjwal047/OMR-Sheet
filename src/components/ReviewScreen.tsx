import { useState, Fragment } from 'react';
import { ExamResult } from '../types';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  EyeOff, 
  Eye, 
  Filter, 
  Calculator,
  RefreshCw,
  Printer,
  Play,
  Edit3
} from 'lucide-react';

interface ReviewScreenProps {
  result: ExamResult;
  onBackToResult: () => void;
  onUpdateHiddenQuestions: (hiddenIndices: number[]) => void;
  onStartNextMock?: (customName?: string) => void;
  nextMockName?: string;
}

export default function ReviewScreen({
  result,
  onBackToResult,
  onUpdateHiddenQuestions,
  onStartNextMock,
  nextMockName,
}: ReviewScreenProps) {
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'na'>('all');
  const [hiddenIds, setHiddenIds] = useState<number[]>(result.hiddenQuestionIds || []);
  const [customMockName, setCustomMockName] = useState(nextMockName || 'Mock Test');

  const toggleHide = (absIndex: number) => {
    let next: number[];
    if (hiddenIds.includes(absIndex)) {
      next = hiddenIds.filter(id => id !== absIndex);
    } else {
      next = [...hiddenIds, absIndex];
    }
    setHiddenIds(next);
    onUpdateHiddenQuestions(next);
  };

  const handleUnhideAll = () => {
    setHiddenIds([]);
    onUpdateHiddenQuestions([]);
  };

  // Re-calculate live stats excluding hidden questions
  const activeQuestions = Array.from({ length: result.totalQ }, (_, i) => i + 1)
    .filter(id => !hiddenIds.includes(id));

  let activeCorrect = 0;
  let activeWrong = 0;
  let activeNA = 0;

  activeQuestions.forEach(id => {
    const uAns = result.userAnswers[id];
    const kAns = result.keyAnswers[id];
    if (!uAns) {
      activeNA++;
    } else if (uAns === kAns) {
      activeCorrect++;
    } else {
      activeWrong++;
    }
  });

  const activeScore = (activeCorrect * result.correctMark) - (activeWrong * result.negativeMark);
  const activeMaxScore = activeQuestions.length * result.correctMark;

  // Format display labels like "S1 - 1" or "Q1"
  const getQuestionLabel = (absIndex: number) => {
    for (let sIdx = 0; sIdx < result.sections.length; sIdx++) {
      const sec = result.sections[sIdx];
      if (absIndex >= sec.startIdx && absIndex < sec.startIdx + sec.count) {
        const local = absIndex - sec.startIdx + 1;
        return {
          sectionName: sec.name,
          label: `S${sIdx + 1} - ${local}`,
          rawNum: local,
        };
      }
    }
    return { sectionName: 'Section', label: `Q${absIndex}`, rawNum: absIndex };
  };

  // Generate hidden list display string
  const hiddenLabels = hiddenIds
    .sort((a, b) => a - b)
    .map(id => getQuestionLabel(id).label);

  const hiddenDisplayStr = hiddenLabels.length > 0 ? hiddenLabels.join(', ') : 'None';

  return (
    <div id="screen-review" className="max-w-xl mx-auto min-h-screen bg-slate-100 flex flex-col pb-12">
      {/* Header */}
      <header className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white px-3.5 py-3 shadow-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBackToResult}
            className="p-1.5 rounded-lg bg-black/15 hover:bg-black/25 text-white transition active:scale-95 shrink-0"
            title="Back to Scorecard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <span className="font-bold text-sm sm:text-base truncate block text-white/95 display-testname">
              Review: {result.testName}
            </span>
            <span className="text-[10px] text-cyan-100 font-medium block">
              Question-by-question breakdown
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 no-print">
          <button
            onClick={() => window.print()}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-xs transition active:scale-95 border border-white/20 flex items-center gap-1.5 cursor-pointer"
            title="Print or Save Review PDF"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            onClick={onBackToResult}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg backdrop-blur-xs transition active:scale-95 border border-white/20 cursor-pointer"
          >
            Back to Result
          </button>
        </div>
      </header>

      {/* Filter Tabs & Hidden Tracker Banner */}
      <div className="bg-white border-b border-slate-200 px-3.5 py-2.5 space-y-2 sticky top-[57px] z-20 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          {/* Tabs */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs w-full sm:w-auto">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded-md font-semibold transition ${
                filter === 'all' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({result.totalQ})
            </button>
            <button
              onClick={() => setFilter('correct')}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded-md font-semibold transition ${
                filter === 'correct' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              Correct ({result.correctCount})
            </button>
            <button
              onClick={() => setFilter('incorrect')}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded-md font-semibold transition ${
                filter === 'incorrect' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:text-rose-900'
              }`}
            >
              Wrong ({result.wrongCount})
            </button>
            <button
              onClick={() => setFilter('na')}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded-md font-semibold transition ${
                filter === 'na' ? 'bg-slate-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Skipped ({result.naCount})
            </button>
          </div>
        </div>

        {/* Hidden Questions Tracker (matching prototype) */}
        <div className="bg-rose-50 border border-rose-200/80 rounded-lg p-2.5 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <EyeOff className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="text-slate-600 font-medium">Hidden/Dropped:</span>
            <span id="hidden-list-display" className="font-bold text-rose-800 truncate font-mono">
              {hiddenDisplayStr}
            </span>
          </div>

          {hiddenIds.length > 0 && (
            <button
              onClick={handleUnhideAll}
              className="text-[11px] text-rose-700 hover:text-rose-900 font-bold underline shrink-0 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Reset All
            </button>
          )}
        </div>
      </div>

      {/* Review Table / List */}
      <main className="p-3">
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-semibold">
                <th className="py-3 px-3 text-center w-12" title="Hide/Drop question from scoring">
                  Hide
                </th>
                <th className="py-3 px-3 text-left">Q.No</th>
                <th className="py-3 px-3 text-center">Your Ans</th>
                <th className="py-3 px-3 text-center">Correct Key</th>
                <th className="py-3 px-3 text-right">Marks</th>
              </tr>
            </thead>
            <tbody id="review-body">
              {(() => {
                const effectiveSections =
                  result.sections && result.sections.length > 0
                    ? result.sections
                    : [
                        {
                          id: 'sec-default',
                          name: 'Section 1',
                          count: result.totalQ,
                          optionsCount: 4,
                          startIdx: 1,
                        },
                      ];

                return effectiveSections.map((sec, secIdx) => {
                  const secIndices: number[] = [];
                  for (let i = 1; i <= sec.count; i++) {
                    secIndices.push(sec.startIdx + i - 1);
                  }

                  const visibleIndices = secIndices.filter((absIndex) => {
                    if (absIndex > result.totalQ) return false;
                    const uAns = result.userAnswers[absIndex];
                    const kAns = result.keyAnswers[absIndex];
                    const isAttempted = !!uAns;
                    const isCorrect = isAttempted && uAns === kAns;
                    const isWrong = isAttempted && uAns !== kAns;
                    const isNA = !isAttempted;

                    if (filter === 'correct') return isCorrect;
                    if (filter === 'incorrect') return isWrong;
                    if (filter === 'na') return isNA;
                    return true;
                  });

                  if (visibleIndices.length === 0) return null;

                  return (
                    <Fragment key={sec.id || `sec-${secIdx}`}>
                      {visibleIndices.map((absIndex, vIdx) => {
                        const isLastRowOfSection = vIdx === visibleIndices.length - 1;
                        const isHidden = hiddenIds.includes(absIndex);

                        const uAns = result.userAnswers[absIndex];
                        const kAns = result.keyAnswers[absIndex];

                        const isAttempted = !!uAns;
                        const isCorrect = isAttempted && uAns === kAns;
                        const isWrong = isAttempted && uAns !== kAns;

                        const { label } = getQuestionLabel(absIndex);

                        return (
                          <tr
                            key={absIndex}
                            style={{
                              borderBottom: isLastRowOfSection ? '4px solid #000000' : undefined,
                            }}
                            className={`transition-colors ${
                              isLastRowOfSection
                                ? 'border-b-[4px] border-black'
                                : 'border-b border-slate-100'
                            } ${
                              isHidden
                                ? 'opacity-40 bg-slate-100 line-through'
                                : isCorrect
                                ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                                : isWrong
                                ? 'bg-rose-50/40 hover:bg-rose-50/70'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* Hide Checkbox */}
                            <td
                              style={{
                                borderBottom: isLastRowOfSection ? '4px solid #000000' : undefined,
                              }}
                              className={`py-3 px-3 text-center ${
                                isLastRowOfSection
                                  ? 'border-b-[4px] border-black'
                                  : 'border-b border-slate-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isHidden}
                                onChange={() => toggleHide(absIndex)}
                                className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                                title="Check to drop/hide this question"
                              />
                            </td>

                            {/* Question Number */}
                            <td
                              style={{
                                borderBottom: isLastRowOfSection ? '4px solid #000000' : undefined,
                              }}
                              className={`py-3 px-3 font-mono font-bold text-slate-800 ${
                                isLastRowOfSection
                                  ? 'border-b-[4px] border-black'
                                  : 'border-b border-slate-100'
                              }`}
                            >
                              <span>{label}</span>
                            </td>

                            {/* Candidate Answer */}
                            <td
                              style={{
                                borderBottom: isLastRowOfSection ? '4px solid #000000' : undefined,
                              }}
                              className={`py-3 px-3 text-center ${
                                isLastRowOfSection
                                  ? 'border-b-[4px] border-black'
                                  : 'border-b border-slate-100'
                              }`}
                            >
                              {isAttempted ? (
                                <span
                                  className={`inline-block w-7 h-7 leading-7 rounded-full font-bold text-xs ${
                                    isCorrect
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {uAns}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono text-[11px]">NA</span>
                              )}
                            </td>

                            {/* Correct Key Answer */}
                            <td
                              style={{
                                borderBottom: isLastRowOfSection ? '4px solid #000000' : undefined,
                              }}
                              className={`py-3 px-3 text-center ${
                                isLastRowOfSection
                                  ? 'border-b-[4px] border-black'
                                  : 'border-b border-slate-100'
                              }`}
                            >
                              {kAns ? (
                                <span className="inline-block w-7 h-7 leading-7 rounded-full font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200">
                                  {kAns}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-[11px]">—</span>
                              )}
                            </td>

                            {/* Marks Delta */}
                            <td
                              style={{
                                borderBottom: isLastRowOfSection ? '4px solid #000000' : undefined,
                              }}
                              className={`py-3 px-3 text-right font-mono font-bold ${
                                isLastRowOfSection
                                  ? 'border-b-[4px] border-black'
                                  : 'border-b border-slate-100'
                              }`}
                            >
                              {isHidden ? (
                                <span className="text-slate-400">0.0</span>
                              ) : isCorrect ? (
                                <span className="text-emerald-600">+{result.correctMark}</span>
                              ) : isWrong ? (
                                <span className="text-rose-600">-{result.negativeMark}</span>
                              ) : (
                                <span className="text-slate-400">0.0</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>

        {/* Bottom Actions & Next Mock Button */}
        <div className="mt-5 space-y-3 no-print">
          {onStartNextMock && (
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-slate-800">
                    Ready for Next Test?
                  </h4>
                  <span className="text-[10px] text-teal-700 font-semibold bg-teal-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <Edit3 className="w-2.5 h-2.5" /> Editable
                  </span>
                </div>

                <div className="mt-1.5 relative max-w-xs">
                  <input
                    type="text"
                    value={customMockName}
                    onChange={(e) => setCustomMockName(e.target.value)}
                    placeholder="Enter test name..."
                    className="w-full pl-7 pr-3 py-1 bg-white border border-teal-300 focus:border-teal-500 rounded-lg text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-hidden shadow-2xs"
                  />
                  <Edit3 className="w-3 h-3 text-teal-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <p className="text-[11px] text-slate-500 mt-1">
                  Change name or start immediately with current configuration.
                </p>
              </div>

              <button
                onClick={() => onStartNextMock(customMockName.trim() || nextMockName)}
                className="w-full sm:w-auto px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start {customMockName.trim() || nextMockName || 'Next Mock'}</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => window.print()}
              className="py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl shadow-2xs transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Review</span>
            </button>
            <button
              onClick={onBackToResult}
              className="py-2.5 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Scorecard</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
