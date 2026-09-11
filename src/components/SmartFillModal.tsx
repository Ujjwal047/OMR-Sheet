import { useState, useRef, useEffect, useCallback, ChangeEvent, ClipboardEvent } from 'react';
import { Section } from '../types';
import { parseAnswersText, formatAnswersToString } from '../utils/parser';
import { 
  X, 
  ClipboardPaste, 
  Camera, 
  Sparkles, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  RefreshCw, 
  FileText,
  ScanLine,
  SlidersHorizontal,
  Wand2,
  Layers
} from 'lucide-react';

interface SmartFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyAnswers: (answers: Record<number, string>) => void;
  totalQ: number;
  sections?: Section[];
  title?: string;
  isAnswerKey?: boolean;
}

export default function SmartFillModal({
  isOpen,
  onClose,
  onApplyAnswers,
  totalQ,
  sections = [],
  title = 'Smart Paste & Lens Camera',
  isAnswerKey = true,
}: SmartFillModalProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'camera'>('text');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('all');
  const [rawText, setRawText] = useState<string>('');
  const [parsedAnswers, setParsedAnswers] = useState<Record<number, string>>({});
  
  // Camera & Image OCR state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Update parsed answers whenever raw text, sections, or selectedSection changes
  useEffect(() => {
    if (rawText.trim()) {
      const parsed = parseAnswersText(rawText, totalQ, sections, selectedSectionId);
      setParsedAnswers(parsed);
    } else {
      setParsedAnswers({});
    }
  }, [rawText, totalQ, sections, selectedSectionId]);

  // Clean up camera stream when closing
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
    }
  }, [isOpen, stopCameraStream]);

  // Clean up camera stream when unmounting
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  const startCamera = async () => {
    stopCameraStream();
    setOcrError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Live camera error, falling back to camera file picker:', err);
      // Fallback to mobile native camera picker
      mobileCameraInputRef.current?.click();
    }
  };

  const capturePhotoFromLiveCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setSelectedImage(dataUrl);
      stopCameraStream();
      // Auto trigger scan
      processImageWithGemini(dataUrl);
    }
  };

  const handleImageFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSelectedImage(dataUrl);
      stopCameraStream();
      // Auto trigger scan
      processImageWithGemini(dataUrl);
    };
    reader.readAsDataURL(file);
    // Reset file input value to allow selecting same file again
    e.target.value = '';
  };

  // Clipboard paste of image (Ctrl+V)
  const handlePasteEvent = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const dataUrl = ev.target?.result as string;
              setSelectedImage(dataUrl);
              setActiveTab('camera');
              processImageWithGemini(dataUrl);
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    }
  };

  const processImageWithGemini = async (imageDataUrl: string) => {
    setIsScanning(true);
    setOcrError(null);
    try {
      const res = await fetch('/api/ocr-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageDataUrl,
          mimeType: 'image/jpeg',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      if (data.formattedString) {
        setRawText(data.formattedString);
        setActiveTab('text');
      } else if (data.pairs && Array.isArray(data.pairs)) {
        const formatted = data.pairs.map((p: any) => `${p.question} ${p.answer}`).join(' ');
        setRawText(formatted);
        setActiveTab('text');
      } else {
        throw new Error('Could not identify question numbers in this image.');
      }
    } catch (err: any) {
      console.error('Scan failed:', err);
      setOcrError(err.message || 'Scan failed. You can also paste the answers manually.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleFormatToStandard = () => {
    const formatted = formatAnswersToString(parsedAnswers, sections);
    if (formatted) {
      setRawText(formatted);
    }
  };

  const handleApply = () => {
    onApplyAnswers(parsedAnswers);
    stopCameraStream();
    onClose();
  };

  const parsedCount = Object.keys(parsedAnswers).length;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onPaste={handlePasteEvent}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/15">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                {title}
              </h3>
              <p className="text-[11px] text-teal-100">
                {isAnswerKey ? 'Fill Official Answer Key' : 'Fill Test Attempt Answers'} (Max: {totalQ} Qs)
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 pt-2 gap-2">
          <button
            onClick={() => {
              stopCameraStream();
              setActiveTab('text');
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg transition border-b-2 ${
              activeTab === 'text'
                ? 'border-cyan-600 text-cyan-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Smart Text Paste</span>
            {parsedCount > 0 && (
              <span className="bg-cyan-100 text-cyan-800 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold">
                {parsedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg transition border-b-2 ${
              activeTab === 'camera'
                ? 'border-cyan-600 text-cyan-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-teal-600" />
            <span>Google Lens / Camera</span>
            <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded text-[10px] font-bold">
              AI
            </span>
          </button>
        </div>

        {/* Tab 1: Smart Text Paste */}
        {activeTab === 'text' && (
          <div className="p-4 overflow-y-auto space-y-3 flex-1">
            {/* Multi-Section Selector Pills */}
            {sections && sections.length > 1 && (
              <div className="bg-cyan-50/70 border border-cyan-200/80 rounded-xl p-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-cyan-950 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-700" />
                    Target Section / Mode:
                  </span>
                  <span className="text-[10px] text-cyan-800 font-medium">
                    {selectedSectionId === 'all' 
                      ? 'Auto-detects all sections' 
                      : `Only for ${sections.find(s => s.id === selectedSectionId)?.name}`}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedSectionId('all')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition border cursor-pointer ${
                      selectedSectionId === 'all'
                        ? 'bg-cyan-700 text-white border-cyan-700 shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                    }`}
                  >
                    All Sections (1 - {totalQ})
                  </button>
                  {sections.map(sec => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setSelectedSectionId(sec.id)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition border cursor-pointer ${
                        selectedSectionId === sec.id
                          ? 'bg-cyan-700 text-white border-cyan-700 shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                      }`}
                    >
                      {sec.name} ({sec.count} Qs : Q{sec.startIdx}-{sec.startIdx + sec.count - 1})
                    </button>
                  ))}
                </div>

                <p className="text-[10.5px] text-cyan-900/80 leading-tight">
                  {selectedSectionId === 'all'
                    ? '✨ Auto-Detect: You can paste both Section 1 and Section 2 together! Each section is captured without overwriting.'
                    : `🎯 Pasting for "${sections.find(s => s.id === selectedSectionId)?.name}": Q1..Q${sections.find(s => s.id === selectedSectionId)?.count} in your text will map to test questions Q${sections.find(s => s.id === selectedSectionId)?.startIdx} to Q${(sections.find(s => s.id === selectedSectionId)?.startIdx || 1) + (sections.find(s => s.id === selectedSectionId)?.count || 0) - 1}.`}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-600" />
                  Paste Answer Text (Any Format)
                </label>
                {parsedCount > 0 && (
                  <button
                    onClick={handleFormatToStandard}
                    className="text-[11px] font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1 bg-cyan-50 hover:bg-cyan-100 px-2 py-0.5 rounded border border-cyan-200 transition cursor-pointer"
                    title="Clean text and reformat into 1 A 2 B 3 C..."
                  >
                    <Wand2 className="w-3 h-3" />
                    Format Standard
                  </button>
                )}
              </div>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Paste your answers here, for example:\n1.1\n2.C\n3.2\n4.1\nor: 1 a 2 b 3 c 4 d\nor: 1:A 2:B 3:C\nor multi-section:\n1.A 2.B ... 15.A\nNARRATION\n1.D 2.A ... 20.B\n(Both sections will be recognized automatically!)`}
                rows={5}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none transition"
              />
            </div>

            {/* Quick Sample Format Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-400 font-medium">Quick Examples:</span>
              <button
                type="button"
                onClick={() => setRawText('1.1\n2.C\n3.2\n4.1\n5.1\n6.3\n7.1\n8.1\n9.C\n10.D\n11.C\n12.3\n13.A')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono rounded border border-slate-200 transition"
              >
                1.1, 2.C, 3.2
              </button>
              <button
                type="button"
                onClick={() => setRawText('1 a 2 b 3 c 4 d 5 a 6 b 7 c 8 d 9 a 10 b')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono rounded border border-slate-200 transition"
              >
                1 a 2 b 3 c
              </button>
              <button
                type="button"
                onClick={() => setRawText('1:A 2:B 3:C 4:D 5:A 6:B 7:C 8:D')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono rounded border border-slate-200 transition"
              >
                1:A 2:B 3:C
              </button>
            </div>

            {/* Live Parsing Preview */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  Recognized Answers:
                </span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  parsedCount === totalQ
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-teal-50 text-teal-700 border-teal-200'
                }`}>
                  {parsedCount} of {totalQ} questions
                </span>
              </div>

              {/* Section-by-section breakdown pills if multiple sections */}
              {sections && sections.length > 1 && (
                <div className="flex flex-wrap gap-1.5 pt-1 pb-1 border-t border-slate-200">
                  {sections.map(sec => {
                    const countInSec = Object.keys(parsedAnswers).filter(k => {
                      const num = parseInt(k, 10);
                      return num >= sec.startIdx && num < sec.startIdx + sec.count;
                    }).length;
                    const isComplete = countInSec === sec.count;

                    return (
                      <span
                        key={sec.id}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          isComplete
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : countInSec > 0
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-white text-slate-500 border-slate-200'
                        }`}
                      >
                        <span>{sec.name}:</span>
                        <span className="font-mono font-bold">{countInSec}/{sec.count}</span>
                        {isComplete && <Check className="w-3 h-3 text-emerald-600" />}
                      </span>
                    );
                  })}
                </div>
              )}

              {parsedCount > 0 ? (
                <div className="max-h-28 overflow-y-auto flex flex-wrap gap-1.5 p-1 bg-white rounded-lg border border-slate-200">
                  {Object.entries(parsedAnswers)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([q, ans]) => (
                      <span
                        key={q}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded text-xs font-mono font-bold"
                      >
                        <span className="text-slate-400 font-normal">#{q}:</span>
                        <span>{ans}</span>
                      </span>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-1">
                  Type or paste text above to see live preview. Formats like &quot;1.1&quot; or &quot;1 a 2 b&quot; are automatically recognized!
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Google Lens / Camera OCR */}
        {activeTab === 'camera' && (
          <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
            {/* Hidden file inputs for Mobile Camera & File Upload */}
            <input
              type="file"
              ref={mobileCameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleImageFile}
              className="hidden"
            />
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageFile}
              className="hidden"
            />

            {/* Live Camera Viewfinder */}
            {isCameraActive ? (
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center border-2 border-teal-500 shadow-md">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Camera Overlay Guide */}
                <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-teal-400/70 m-4 rounded-lg flex items-center justify-center">
                  <span className="text-[11px] text-white/90 bg-black/60 px-2.5 py-1 rounded backdrop-blur-xs">
                    Align answer sheet / key inside frame
                  </span>
                </div>

                {/* Capture & Cancel buttons */}
                <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
                  <button
                    onClick={capturePhotoFromLiveCamera}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-full shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture & Scan</span>
                  </button>
                  <button
                    onClick={stopCameraStream}
                    className="px-3 py-2 bg-slate-800/80 hover:bg-slate-900 text-white font-semibold text-xs rounded-full cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : selectedImage ? (
              /* Selected / Captured Image Preview */
              <div className="relative bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                <img
                  src={selectedImage}
                  alt="Captured test sheet"
                  className="w-full max-h-48 object-contain bg-slate-900/10"
                />

                {isScanning && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4">
                    <div className="relative w-12 h-12 flex items-center justify-center mb-2">
                      <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
                      <ScanLine className="w-6 h-6 text-amber-300 absolute animate-pulse" />
                    </div>
                    <span className="text-sm font-bold">Scanning with Google Lens AI...</span>
                    <span className="text-[11px] text-teal-200 mt-0.5">Extracting question numbers and answers</span>
                  </div>
                )}

                {!isScanning && (
                  <div className="p-2.5 bg-white border-t border-slate-200 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-600 font-medium truncate">
                      Photo captured
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => processImageWithGemini(selectedImage)}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                      >
                        Rescan
                      </button>
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="px-2 py-1 text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Action Options when no image is loaded */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={startCamera}
                  className="p-4 bg-teal-50/70 hover:bg-teal-100/70 border-2 border-dashed border-teal-300 hover:border-teal-500 rounded-xl flex flex-col items-center justify-center gap-2 text-center transition group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-teal-900 block">
                      Live Camera
                    </span>
                    <span className="text-[10px] text-teal-700">
                      Capture directly from webcam / phone
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => mobileCameraInputRef.current?.click()}
                  className="p-4 bg-cyan-50/70 hover:bg-cyan-100/70 border-2 border-dashed border-cyan-300 hover:border-cyan-500 rounded-xl flex flex-col items-center justify-center gap-2 text-center transition group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-cyan-600 text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition">
                    <ScanLine className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-cyan-900 block">
                      Google Lens / Native Camera
                    </span>
                    <span className="text-[10px] text-cyan-700">
                      Open device camera directly
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="sm:col-span-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Upload Answer Key Photo or Screenshot (or paste with Ctrl+V)</span>
                </button>
              </div>
            )}

            {/* Error Message if any */}
            {ocrError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Scan Notice:</span> {ocrError}
                  <p className="mt-1 text-rose-700 text-[11px]">
                    Tip: You can switch to the &quot;Smart Text Paste&quot; tab to type or paste options like &quot;1.1, 2.C, 3.2&quot; manually!
                  </p>
                </div>
              </div>
            )}

            {/* Help guidelines */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 block flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Camera & Lens Scanner Support:
              </span>
              <p>&bull; Photo of coaching answer keys, book solutions, or handwritten notes.</p>
              <p>&bull; Supports numbered formats: 1.1 (Q1 = A), 2.C, 3.2 (Q3 = B), etc.</p>
              <p>&bull; After scanning, answers are automatically parsed and formatted into &quot;1 A 2 B 3 C&quot;.</p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={parsedCount === 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
              parsedCount > 0
                ? 'bg-teal-600 hover:bg-teal-700 text-white active:scale-95 shadow-teal-500/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Fill {parsedCount > 0 ? `${parsedCount} Answers` : 'Answers'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
