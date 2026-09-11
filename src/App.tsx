import { useState, useEffect, useCallback } from 'react';
import { Section, ExamScreen, ExamResult, ExamBackup, TimerMode } from './types';
import { 
  saveExamBackup, 
  clearExamBackup, 
  getExamHistory, 
  saveExamToHistory, 
  deleteExamFromHistory,
  computeNextMockName
} from './utils/storage';

import SetupScreen from './components/SetupScreen';
import TestScreen from './components/TestScreen';
import SubmitModal from './components/SubmitModal';
import AnswerKeyScreen from './components/AnswerKeyScreen';
import ResultScreen from './components/ResultScreen';
import ReviewScreen from './components/ReviewScreen';
import HistoryModal from './components/HistoryModal';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ExamScreen>('setup');

  // Exam configurations
  const [testName, setTestName] = useState<string>('Mock Test 1');
  const [correctMark, setCorrectMark] = useState<number>(2.0);
  const [negativeMark, setNegativeMark] = useState<number>(0.5);
  const [sections, setSections] = useState<Section[]>([]);
  const [timerMode, setTimerMode] = useState<TimerMode>('stopwatch');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | undefined>(undefined);
  const [antiCheatAlerts, setAntiCheatAlerts] = useState<boolean>(true);

  // Exam answers & runtime
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [keyAnswers, setKeyAnswers] = useState<Record<number, string>>({});
  const [testSeconds, setTestSeconds] = useState<number>(0);

  // Modals & History
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [history, setHistory] = useState<ExamResult[]>([]);
  const [currentResult, setCurrentResult] = useState<ExamResult | null>(null);

  // Load history on mount
  useEffect(() => {
    setHistory(getExamHistory());
  }, []);

  // Browser reload / leave warning while on test screen
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentScreen === 'test') {
        e.preventDefault();
        e.returnValue = 'You have an active exam in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentScreen]);

  // Periodic backup save while on test screen
  useEffect(() => {
    if (currentScreen === 'test') {
      const totalQ = sections.reduce((sum, s) => sum + s.count, 0);
      saveExamBackup({
        testName,
        correctMark,
        negativeMark,
        sections,
        totalQ,
        userAnswers,
        totalSeconds: testSeconds,
        timerMode,
        timeLimitMinutes,
        lastSaved: Date.now(),
      });
    }
  }, [currentScreen, testName, correctMark, negativeMark, sections, userAnswers, testSeconds, timerMode, timeLimitMinutes]);

  // Handler: Start New Exam
  const handleStartExam = (config: {
    testName: string;
    correctMark: number;
    negativeMark: number;
    initialSections?: Section[];
    timerMode?: TimerMode;
    timeLimitMinutes?: number;
    antiCheatAlerts?: boolean;
  }) => {
    setTestName(config.testName);
    setCorrectMark(config.correctMark);
    setNegativeMark(config.negativeMark);
    setTimerMode(config.timerMode || 'stopwatch');
    setTimeLimitMinutes(config.timeLimitMinutes);
    setAntiCheatAlerts(config.antiCheatAlerts ?? true);

    if (config.initialSections && config.initialSections.length > 0) {
      setSections(config.initialSections);
    } else {
      setSections([]);
    }

    setUserAnswers({});
    setKeyAnswers({});
    setTestSeconds(0);
    setCurrentResult(null);
    setCurrentScreen('test');
  };

  // Handler: Resume Exam from Backup
  const handleResumeExam = (backup: ExamBackup) => {
    setTestName(backup.testName || 'Mock Test');
    setCorrectMark(backup.correctMark);
    setNegativeMark(backup.negativeMark);
    setSections(backup.sections || []);
    setUserAnswers(backup.userAnswers || {});
    setKeyAnswers({});
    setTestSeconds(backup.totalSeconds || 0);
    setTimerMode(backup.timerMode || 'stopwatch');
    setTimeLimitMinutes(backup.timeLimitMinutes);
    setCurrentResult(null);
    setCurrentScreen('test');
  };

  // Handler: Dynamic Question Addition (On-the-fly builder)
  const handleAddSection = (count: number, options: number, name?: string) => {
    const currentTotal = sections.reduce((sum, s) => sum + s.count, 0);
    const newSection: Section = {
      id: `sec-${Date.now()}`,
      name: name || `Section ${sections.length + 1}`,
      count,
      optionsCount: options,
      startIdx: currentTotal + 1,
    };
    setSections(prev => [...prev, newSection]);
  };

  // Handler: Option Selection in Test
  const handleSelectOption = (qIndex: number, opt: string) => {
    setUserAnswers(prev => {
      if (prev[qIndex] !== undefined) return prev; // Locked once filled! Must clear first
      return {
        ...prev,
        [qIndex]: opt,
      };
    });
  };

  // Handler: Option Clear in Test
  const handleClearOption = (qIndex: number) => {
    setUserAnswers(prev => {
      const copy = { ...prev };
      delete copy[qIndex];
      return copy;
    });
  };

  // Handler: Key Option Selection
  const handleSelectKeyOption = (qIndex: number, opt: string) => {
    setKeyAnswers(prev => {
      if (prev[qIndex] !== undefined) return prev; // Locked once filled! Must clear first
      return {
        ...prev,
        [qIndex]: opt,
      };
    });
  };

  // Handler: Key Option Clear
  const handleClearKeyOption = (qIndex: number) => {
    setKeyAnswers(prev => {
      const copy = { ...prev };
      delete copy[qIndex];
      return copy;
    });
  };

  // Handler: Batch Key Assignment (Paste / Pattern fill)
  const handleBatchSetKey = (answers: Record<number, string>) => {
    setKeyAnswers(answers);
  };

  // Handler: Confirm submit and transition to Answer Key screen
  const handleProceedToKey = () => {
    setIsSubmitModalOpen(false);
    setCurrentScreen('key');
  };

  // Handler: Generate Results from answers & key
  const handleGenerateResult = () => {
    const totalQ = sections.reduce((sum, s) => sum + s.count, 0);
    if (totalQ === 0) return;

    let correctCount = 0;
    let wrongCount = 0;
    let naCount = 0;

    for (let i = 1; i <= totalQ; i++) {
      const uAns = userAnswers[i];
      const kAns = keyAnswers[i];

      if (!uAns) {
        naCount++;
      } else if (uAns === kAns) {
        correctCount++;
      } else {
        wrongCount++;
      }
    }

    const score = (correctCount * correctMark) - (wrongCount * negativeMark);
    const maxScore = totalQ * correctMark;
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const attempted = correctCount + wrongCount;
    const accuracy = attempted > 0 ? (correctCount / attempted) * 100 : 0;

    const resultObj: ExamResult = {
      id: `result-${Date.now()}`,
      testName,
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      totalQ,
      correctCount,
      wrongCount,
      naCount,
      score,
      maxScore,
      percentage: Math.max(0, percentage),
      accuracy,
      timeTakenSeconds: testSeconds,
      correctMark,
      negativeMark,
      sections,
      userAnswers,
      keyAnswers,
      hiddenQuestionIds: [],
    };

    // Save immediately and permanently into localStorage.setItem('previous_tests', ...)
    saveExamToHistory(resultObj);
    const freshHistory = getExamHistory();
    setHistory([...freshHistory]);
    setCurrentResult(resultObj);
    clearExamBackup();
    setCurrentScreen('result');
  };

  // Handler: Update hidden/dropped questions from Review Screen
  const handleUpdateHiddenQuestions = (hiddenIndices: number[]) => {
    if (!currentResult) return;
    const updated = {
      ...currentResult,
      hiddenQuestionIds: hiddenIndices,
    };
    setCurrentResult(updated);
    saveExamToHistory(updated);
    const fresh = getExamHistory();
    setHistory([...fresh]);
  };

  // Handler: Finish / Reset to Home
  const handleFinishExam = () => {
    // If currentResult exists, ensure it is saved
    if (currentResult) {
      saveExamToHistory(currentResult);
    }
    // Always refresh history state from localStorage.getItem('previous_tests')
    const fresh = getExamHistory();
    setHistory([...fresh]);
    clearExamBackup();
    setSections([]);
    setUserAnswers({});
    setKeyAnswers({});
    setTestSeconds(0);
    setCurrentResult(null);
    setCurrentScreen('setup');
  };

  // Handler: Delete single history item
  const handleDeleteHistory = (id: string) => {
    deleteExamFromHistory(id);
    setHistory(getExamHistory());
  };

  // Handler: View past result from history (Scorecard)
  const handleSelectHistoryResult = (item: ExamResult) => {
    setCurrentResult(item);
    setIsHistoryModalOpen(false);
    setCurrentScreen('result');
  };

  // Handler: View past result question review directly
  const handleSelectHistoryReview = (item: ExamResult) => {
    setCurrentResult(item);
    setIsHistoryModalOpen(false);
    setCurrentScreen('review');
  };

  // Handler: Batch set answers from Smart Paste / Camera
  const handleBatchSetUserAnswers = (answers: Record<number, string>) => {
    setUserAnswers(prev => ({
      ...prev,
      ...answers,
    }));
  };

  // Compute next sequential mock name (e.g. Mock Test 1 -> Mock Test 2 -> Mock Test 3)
  const nextMockName = computeNextMockName(testName || currentResult?.testName, history);

  // Handler: Launch next mock test immediately with 0 questions
  const handleStartNextMock = (customName?: string) => {
    const nextName = (customName && customName.trim())
      ? customName.trim()
      : computeNextMockName(testName || currentResult?.testName, history);
    setTestName(nextName);
    setSections([]); // Open with 0 questions so user can add as needed
    setUserAnswers({});
    setKeyAnswers({});
    setTestSeconds(0);
    setCurrentResult(null);
    clearExamBackup();
    setCurrentScreen('test');
  };

  const totalQuestions = sections.reduce((sum, s) => sum + s.count, 0);
  const answeredCount = Object.keys(userAnswers).filter(k => parseInt(k) <= totalQuestions).length;

  return (
    <div className="min-h-screen bg-slate-100 antialiased font-sans text-slate-800">
      {/* Screen 1: Setup */}
      {currentScreen === 'setup' && (
        <SetupScreen
          onStartExam={handleStartExam}
          onResumeExam={handleResumeExam}
          onOpenHistory={() => setIsHistoryModalOpen(true)}
          history={history}
          onSelectHistoryResult={handleSelectHistoryResult}
          onSelectHistoryReview={handleSelectHistoryReview}
          onDeleteHistory={handleDeleteHistory}
        />
      )}

      {/* Screen 2: Test Sheet */}
      {currentScreen === 'test' && (
        <TestScreen
          testName={testName}
          sections={sections}
          userAnswers={userAnswers}
          initialSeconds={testSeconds}
          initialTimerMode={timerMode}
          initialTimeLimitMinutes={timeLimitMinutes}
          antiCheatAlerts={antiCheatAlerts}
          onAddSection={handleAddSection}
          onSelectOption={handleSelectOption}
          onClearOption={handleClearOption}
          onBatchSetAnswers={handleBatchSetUserAnswers}
          onSubmit={(totalSec, isAutoSubmit) => {
            setTestSeconds(totalSec);
            if (isAutoSubmit) {
              handleProceedToKey();
            } else {
              setIsSubmitModalOpen(true);
            }
          }}
          onBack={(sec) => {
            if (typeof sec === 'number') {
              setTestSeconds(sec);
            }
            setCurrentScreen('setup');
          }}
        />
      )}

      {/* Screen 3: Submit Confirmation Modal */}
      <SubmitModal
        isOpen={isSubmitModalOpen}
        totalQ={totalQuestions}
        answeredCount={answeredCount}
        flaggedCount={0}
        elapsedSeconds={testSeconds}
        onCancel={() => setIsSubmitModalOpen(false)}
        onConfirm={handleProceedToKey}
      />

      {/* Screen 4: Answer Key Sheet */}
      {currentScreen === 'key' && (
        <AnswerKeyScreen
          testName={testName}
          sections={sections}
          keyAnswers={keyAnswers}
          userAnswers={userAnswers}
          onSelectKeyOption={handleSelectKeyOption}
          onClearKeyOption={handleClearKeyOption}
          onBatchSetKey={handleBatchSetKey}
          onGenerateResult={handleGenerateResult}
          onBackToTest={() => setCurrentScreen('test')}
        />
      )}

      {/* Screen 5: Scorecard & Analytics */}
      {currentScreen === 'result' && currentResult && (
        <ResultScreen
          result={currentResult}
          onReviewAnswers={() => setCurrentScreen('review')}
          onFinishExam={handleFinishExam}
          onStartNextMock={handleStartNextMock}
          nextMockName={nextMockName}
        />
      )}

      {/* Screen 6: Question Review & Drop/Hide */}
      {currentScreen === 'review' && currentResult && (
        <ReviewScreen
          result={currentResult}
          onBackToResult={() => setCurrentScreen('result')}
          onUpdateHiddenQuestions={handleUpdateHiddenQuestions}
          onStartNextMock={handleStartNextMock}
          nextMockName={nextMockName}
        />
      )}

      {/* Past Tests History Modal */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        history={history}
        onSelectResult={handleSelectHistoryResult}
        onDeleteResult={handleDeleteHistory}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </div>
  );
}
