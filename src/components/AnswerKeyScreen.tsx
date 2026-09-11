import { useState } from 'react';
import { Section } from '../types';
import { ALPHABETS } from '../utils/storage';
import SmartFillModal from './SmartFillModal';
import { 
  ArrowLeft, 
  KeyRound, 
  CheckCheck, 
  ClipboardPaste, 
  Camera,
  Trash2, 
  Sparkles
} from 'lucide-react';

interface AnswerKeyScreenProps {
  testName: string;
  sections: Section[];
  keyAnswers: Record<number, string>;
  userAnswers: Record<number, string>;
  onSelectKeyOption: (qIndex: number, opt: string) => void;
  onClearKeyOption: (qIndex: number) => void;
  onBatchSetKey: (answers: Record<number, string>) => void;
  onGenerateResult: () => void;
  onBackToTest: () => void;
}

export default function AnswerKeyScreen({
  testName,
  sections,
  keyAnswers,
  userAnswers,
  onSelectKeyOption,
  onClearKeyOption,
  onBatchSetKey,
  onGenerateResult,
  onBackToTest,
}: AnswerKeyScreenProps) {
  const [showSmartModal, setShowSmartModal] = useState(false);

  const totalQ = sections.reduce((sum, s) => sum + s.count, 0);
  const filledKeyCount = Object.keys(keyAnswers).filter(k => parseInt(k) <= totalQ).length;
  const leftKeyCount = Math.max(0, totalQ - filledKeyCount);

  const handleApplySmartAnswers = (answers: Record<number, string>) => {
    onBatchSetKey({
      ...keyAnswers,
      ...answers,
    });
  };

  const handleQuickDemoKey = () => {
    const demo: Record<number, string> = {};
    sections.forEach(sec => {
      for (let i = 1; i <= sec.count; i++) {
        const absIndex = sec.startIdx + i - 1;
        const optLetter = ALPHABETS[(i - 1) % sec.optionsCount];
        demo[absIndex] = optLetter;
      }
    });
    onBatchSetKey(demo);
  };

  return (
    <div id="screen-key" className="max-w-xl mx-auto min-h-screen bg-slate-100 flex flex-col pb-24 select-none">
      {/* Header */}
      <header className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-3.5 py-3 shadow-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBackToTest}
            className="p-1.5 rounded-lg bg-black/15 hover:bg-black/25 text-white transition active:scale-95 shrink-0"
            title="Back to Test Sheet"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <span className="font-bold text-sm sm:text-base truncate block text-white/95 display-testname">
              {testName}
            </span>
            <span className="text-[10px] text-teal-100 font-medium block">
              Official Answer Key Entry
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSmartModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-xs transition active:scale-95 border border-white/20 cursor-pointer"
            title="Fast paste or scan answer key with camera/Lens"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <Camera className="w-3.5 h-3.5 text-amber-300" />
            <span>Paste / Scan Key</span>
          </button>
        </div>
      </header>

      {/* Sub-header Bar */}
      <div className="bg-teal-50 border-b border-teal-200 px-3.5 py-2 flex items-center justify-between text-xs font-semibold text-teal-900 sticky top-[57px] z-20 shadow-2xs">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-teal-600" />
          <span>Enter Correct Answers:</span>
          <span 
            id="key-left"
            className={`px-2 py-0.5 rounded-full font-bold text-xs ${
              leftKeyCount === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-teal-100 text-teal-800'
            }`}
          >
            {leftKeyCount} Left
          </span>
        </div>

        <div className="flex items-center gap-2">
          {filledKeyCount === 0 && (
            <button
              onClick={handleQuickDemoKey}
              className="text-[11px] text-teal-700 hover:text-teal-900 underline flex items-center gap-1"
              title="Populate test sequence (A, B, C, D pattern) for testing"
            >
              <Sparkles className="w-3 h-3 text-teal-600" />
              <span>Fill Demo Pattern</span>
            </button>
          )}
          {filledKeyCount > 0 && (
            <button
              onClick={() => onBatchSetKey({})}
              className="text-[11px] text-rose-600 hover:text-rose-800 font-medium flex items-center gap-0.5"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Key</span>
            </button>
          )}
        </div>
      </div>

      {/* Questions list for Answer Key */}
      <main className="p-3 space-y-4 flex-1">
        {sections.map((sec, secIdx) => {
          const rows = [];
          for (let i = 1; i <= sec.count; i++) {
            const absIndex = sec.startIdx + i - 1;
            const currentAns = keyAnswers[absIndex];
            const candidateAns = userAnswers[absIndex];
            const isFilled = !!currentAns;

            rows.push(
              <div
                key={absIndex}
                id={`key-row-${absIndex}`}
                className={`bg-white rounded-xl p-2.5 sm:p-3 border transition-all shadow-xs flex items-center gap-2 sm:gap-3 relative ${
                  isFilled 
                    ? 'border-teal-300 ring-1 ring-teal-500/20 bg-teal-50/10' 
                    : 'border-slate-200'
                }`}
              >
                {/* Question Number */}
                <div className="flex flex-col items-center justify-center min-w-[36px] shrink-0">
                  <span className="font-extrabold text-sm sm:text-base text-teal-800 font-mono leading-none">
                    {i}
                  </span>
                </div>

                {/* Option Boxes */}
                <div className="flex-1 flex border-2 border-slate-800 rounded-md overflow-hidden">
                  {Array.from({ length: sec.optionsCount }).map((_, optIdx) => {
                    const letter = ALPHABETS[optIdx] || `${optIdx + 1}`;
                    const isSelected = currentAns === letter;

                    return (
                      <button
                        key={letter}
                        id={`key-opt-${absIndex}-${letter}`}
                        onClick={() => {
                          if (currentAns) return; // Locked once filled! Must click Clear to change
                          onSelectKeyOption(absIndex, letter);
                        }}
                        className={`flex-1 py-2 text-center font-bold text-xs sm:text-sm border-r-2 last:border-r-0 border-slate-800 transition-colors ${
                          currentAns && !isSelected
                            ? 'bg-white text-slate-400 cursor-not-allowed'
                            : isSelected
                            ? 'bg-teal-700 text-white font-extrabold'
                            : 'bg-white text-slate-800 hover:bg-slate-100 cursor-pointer'
                        }`}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>

                {/* Clear Key response */}
                <button
                  onClick={() => onClearKeyOption(absIndex)}
                  disabled={!isFilled}
                  className={`px-2 py-1.5 rounded text-[11px] font-bold transition shrink-0 ${
                    isFilled
                      ? 'text-rose-600 hover:bg-rose-50 active:scale-95 border border-rose-200'
                      : 'text-slate-300 cursor-not-allowed'
                  }`}
                >
                  Clear
                </button>
              </div>
            );
          }

          return (
            <div key={sec.id} className="space-y-2">
              <div className="bg-slate-200/90 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase flex items-center justify-between border border-slate-300">
                <span>{sec.name} ({sec.count} Questions)</span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Key: {Object.keys(keyAnswers).filter(k => {
                    const idx = parseInt(k);
                    return idx >= sec.startIdx && idx < sec.startIdx + sec.count;
                  }).length}/{sec.count}
                </span>
              </div>

              <div className="space-y-2">
                {rows}
              </div>

              {/* Fat horizontal black line below every section */}
              <div 
                className="w-full my-4 border-b-[4px] border-black" 
                style={{ borderBottom: '4px solid #000000' }} 
              />
            </div>
          );
        })}
      </main>

      {/* Smart Fill & Camera/Lens Modal */}
      <SmartFillModal
        isOpen={showSmartModal}
        onClose={() => setShowSmartModal(false)}
        onApplyAnswers={handleApplySmartAnswers}
        totalQ={totalQ}
        sections={sections}
        title="Official Key: Smart Paste & Lens"
        isAnswerKey={true}
      />

      {/* Bottom Floating Bar */}
      <footer className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg z-30">
        <button
          id="btn-generate-result"
          onClick={onGenerateResult}
          className="w-full py-3 px-4 rounded-xl font-bold text-sm sm:text-base transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white cursor-pointer"
        >
          <CheckCheck className="w-5 h-5" />
          Generate Result ({filledKeyCount}/{totalQ} Keyed)
        </button>
      </footer>
    </div>
  );
}
