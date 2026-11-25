import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { ExtractionMode, GroqModelConfig } from '../../types';
import { EXTRACTION_PRESETS, GROQ_VISION_MODELS } from '../../utils/constants';
import { analyzeImageWithGroq, analyzeDocumentWithGroq, fetchGroqVisionModels } from '../../services/groq';
import { compressImage, extractTitleFromMarkdown } from '../../utils/image';
import { parsePdfFile, parseTextFile } from '../../utils/document';
import { triggerConfetti } from '../../utils/confetti';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import {
  Upload,
  Camera,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  FileText,
  ScanText,
  BookOpen,
  CheckSquare,
  X,
  Copy,
  Check,
  Edit3,
  Eye,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  Key,
  ChevronDown
} from 'lucide-react';

export const SnapToNotes: React.FC = () => {
  const {
    apiKey,
    addNote,
    updateNote,
    addTodoItem,
    showToast,
    setIsNotepadDrawerOpen,
    setIsSettingsModalOpen
  } = useApp();

  // Vision Model Selection
  const [availableVisionModels, setAvailableVisionModels] = useState<GroqModelConfig[]>(GROQ_VISION_MODELS);
  const [selectedVisionModel, setSelectedVisionModel] = useState<string>('meta-llama/llama-4-scout-17b-16e-instruct');
  const [customVisionModel, setCustomVisionModel] = useState<string>('');
  const [isCustomVisionModel, setIsCustomVisionModel] = useState<boolean>(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Dynamically fetch vision models from Groq when API key is available
  useEffect(() => {
    if (apiKey && apiKey.trim()) {
      fetchGroqVisionModels(apiKey).then(models => {
        if (models && models.length > 0) {
          setAvailableVisionModels(models);
          if (!models.some(m => m.id === selectedVisionModel)) {
            setSelectedVisionModel(models[0].id);
          }
        }
      });
    }
  }, [apiKey, selectedVisionModel]);

  // Close model dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeVisionModelId = isCustomVisionModel && customVisionModel.trim() ? customVisionModel.trim() : selectedVisionModel;
  const currentVisionConfig = availableVisionModels.find(m => m.id === activeVisionModelId) || GROQ_VISION_MODELS.find(m => m.id === activeVisionModelId);
  const visionModelDisplayName = currentVisionConfig
    ? `${currentVisionConfig.name}${currentVisionConfig.badge ? ` · ${currentVisionConfig.badge}` : ''}`
    : activeVisionModelId;

  // Image & Document State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [documentText, setDocumentText] = useState<string | null>(null);
  const [documentMeta, setDocumentMeta] = useState<{ pageCount?: number; charCount: number } | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  // Extraction Settings
  const [selectedMode, setSelectedMode] = useState<ExtractionMode>('summary');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [autoSaveToNotepad, setAutoSaveToNotepad] = useState<boolean>(true);
  const [autoExtractOnUpload, setAutoExtractOnUpload] = useState<boolean>(true);

  // Webcam State
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const cameraFallbackInputRef = useRef<HTMLInputElement>(null);

  // Processing & Output State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [extractedContent, setExtractedContent] = useState<string>('');
  const [extractedTitle, setExtractedTitle] = useState<string>('');
  const [stats, setStats] = useState<{
    latencyMs: number;
    tokensPerSecond?: number;
    modelUsed?: string;
  } | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const [errorAlert, setErrorAlert] = useState<{ message: string; isKeyError?: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Execution: Groq Multimodal Vision or Document Extraction Call
  const triggerExtraction = useCallback(async (
    targetImage?: string,
    targetName?: string,
    targetDocText?: string | null
  ) => {
    const activeImage = targetImage !== undefined ? targetImage : imagePreview;
    const activeDocText = targetDocText !== undefined ? targetDocText : documentText;
    const activeName = targetName || imageName;

    if (!activeImage && !activeDocText) {
      showToast('Please select, paste, or drop an image, PDF, or file first', 'warning');
      return;
    }

    setIsProcessing(true);
    setErrorAlert(null);
    setStats(null);

    const fallbackTitle = activeName
      ? `${activeName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ')}`
      : `Extracted Note (${selectedMode.toUpperCase()})`;

    try {
      const result = activeDocText
        ? await analyzeDocumentWithGroq({
            apiKey,
            textContent: activeDocText,
            filename: activeName || 'Document',
            mode: selectedMode,
            customPrompt: selectedMode === 'custom' ? customPrompt : undefined
          })
        : await analyzeImageWithGroq({
            apiKey,
            imageBase64: activeImage!,
            mode: selectedMode,
            customPrompt: selectedMode === 'custom' ? customPrompt : undefined,
            model: activeVisionModelId
          });

      // Automatically parse the # Title from the first line
      const { title: parsedTitle, body: cleanBody } = extractTitleFromMarkdown(
        result.content,
        fallbackTitle
      );

      setExtractedTitle(parsedTitle);
      setExtractedContent(cleanBody);
      setStats({
        latencyMs: result.latencyMs,
        tokensPerSecond: result.tokensPerSecond,
        modelUsed: result.modelUsed
      });

      if (result.fallbackModel) {
        showToast(`Used fallback model: ${result.fallbackModel.split('/').pop()}`, 'info');
      }

      // Auto-save to Shared Notepad
      if (autoSaveToNotepad) {
        const saved = addNote({
          title: parsedTitle,
          content: cleanBody,
          tags: ['snap-to-notes', activeDocText ? 'document' : 'vision', selectedMode],
          source: 'snap-to-notes'
        });
        setSavedNoteId(saved.id);
        triggerConfetti();
        showToast(`Saved "${saved.title}" to Shared Notepad ✓`, 'success', {
          label: 'View in Notepad',
          onClick: () => setIsNotepadDrawerOpen(true)
        });
      } else {
        showToast('Extraction complete! Click "Save to Notepad" when ready.', 'success');
      }
    } catch (err: any) {
      console.error('Extraction error:', err);
      const isKey = err.message?.includes('API Key') || err.message?.includes('401');
      setErrorAlert({
        message: err.message || 'Extraction encountered an error.',
        isKeyError: isKey
      });
      showToast(err.message || 'Extraction failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [
    imagePreview,
    documentText,
    imageName,
    selectedMode,
    apiKey,
    customPrompt,
    activeVisionModelId,
    autoSaveToNotepad,
    addNote,
    showToast,
    setIsNotepadDrawerOpen
  ]);

  // Core Image Processing with Canvas Compression
  const processAndLoadImage = useCallback(
    async (fileOrDataUrl: File | string, filename?: string) => {
      try {
        setIsCompressing(true);
        setErrorAlert(null);
        setSavedNoteId(null);
        setDocumentText(null);
        setDocumentMeta(null);

        const name = filename || (typeof fileOrDataUrl !== 'string' ? fileOrDataUrl.name : 'Uploaded_Image.jpg');
        setImageName(name);

        // Compress large photos to max 1600px, JPEG quality 0.85
        const compressedBase64 = await compressImage(fileOrDataUrl, 1600, 0.85);
        setImagePreview(compressedBase64);

        // If auto-extract is turned on, trigger extraction immediately
        if (autoExtractOnUpload) {
          triggerExtraction(compressedBase64, name, null);
        } else {
          setExtractedContent('');
          setExtractedTitle('');
        }
      } catch (err: any) {
        console.error('Image compression failed:', err);
        showToast('Failed to process image', 'error');
      } finally {
        setIsCompressing(false);
      }
    },
    [autoExtractOnUpload, triggerExtraction, showToast]
  );

  // Process PDF or Text/Document Files
  const processAndLoadDocument = useCallback(
    async (file: File) => {
      try {
        setIsCompressing(true);
        setErrorAlert(null);
        setSavedNoteId(null);
        setImagePreview(null);
        setDocumentText(null);
        setDocumentMeta(null);
        setImageName(file.name);

        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const parsed = isPdf ? await parsePdfFile(file) : await parseTextFile(file);

        if (parsed.isScannedPdf && parsed.renderedImageBase64) {
          setImagePreview(parsed.renderedImageBase64);
          showToast('Scanned PDF detected — using Vision OCR on page 1', 'info');
          if (autoExtractOnUpload) {
            triggerExtraction(parsed.renderedImageBase64, file.name, null);
          } else {
            setExtractedContent('');
            setExtractedTitle('');
          }
          return;
        }

        if (!parsed.text || !parsed.text.trim()) {
          showToast('No readable text found in this file', 'warning');
          return;
        }

        setDocumentText(parsed.text);
        setDocumentMeta({ pageCount: parsed.pageCount, charCount: parsed.text.length });

        if (autoExtractOnUpload) {
          triggerExtraction('', file.name, parsed.text);
        } else {
          setExtractedContent('');
          setExtractedTitle('');
        }
      } catch (err: any) {
        console.error('Document parsing failed:', err);
        showToast(err.message || 'Failed to read file/PDF', 'error');
      } finally {
        setIsCompressing(false);
      }
    },
    [autoExtractOnUpload, triggerExtraction, showToast]
  );

  // Handle Clipboard Paste (Cmd+V / Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const timeStr = new Date().toLocaleTimeString().replace(/:/g, '-');
            processAndLoadImage(file, `Clipboard_Paste_${timeStr}.jpg`);
            showToast('Pasted image from clipboard', 'info');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processAndLoadImage, showToast]);

  // Clean up webcam stream on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  const stopWebcam = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsWebcamActive(false);
  };

  const startWebcam = async () => {
    try {
      setIsWebcamActive(true);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera device access is not supported by your browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('Direct webcam access failed, offering native file camera:', err);
      setIsWebcamActive(false);
      if (cameraFallbackInputRef.current) {
        cameraFallbackInputRef.current.click();
      } else {
        showToast('Camera access blocked. Please check browser permissions.', 'error');
      }
    }
  };

  const captureWebcamSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    const filename = `Camera_Capture_${new Date().toISOString().slice(11, 19).replace(/:/g, '-')}.jpg`;
    stopWebcam();
    processAndLoadImage(dataUrl, filename);
    showToast('Photo captured', 'success');
  };

  const handleUploadedFile = (file: File) => {
    const lowerName = file.name.toLowerCase();
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isTextDoc =
      file.type.startsWith('text/') ||
      /\.(txt|md|markdown|csv|json|log|ts|tsx|js|jsx|py|html|xml|yaml|yml)$/i.test(lowerName);

    if (isImage) {
      processAndLoadImage(file, file.name);
    } else if (isPdf || isTextDoc) {
      processAndLoadDocument(file);
    } else {
      showToast('Please select an image, PDF, or text/markdown file', 'warning');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadedFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadedFile(e.dataTransfer.files[0]);
    }
  };

  // Sample SVG Diagrams Loader
  const loadSampleImage = (type: 'architecture' | 'notes') => {
    let svgContent = '';
    let name = '';

    if (type === 'architecture') {
      name = 'System_Topology_Whiteboard.png';
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400" fill="#211E1A">
        <rect width="800" height="400" fill="#211E1A" stroke="#383129" stroke-width="2"/>
        <text x="40" y="50" fill="#C6A783" font-family="serif" font-size="20" font-weight="bold">GROQ NEXUS TOPOLOGY</text>
        <rect x="40" y="80" width="200" height="100" rx="12" fill="#2C2721" stroke="#514638" stroke-width="1.5"/>
        <text x="60" y="125" fill="#F2EDE5" font-family="sans-serif" font-size="13" font-weight="bold">LLM PLAYGROUND</text>
        <text x="60" y="150" fill="#A79B8C" font-family="monospace" font-size="11">Sub-second Chat</text>
        <rect x="300" y="80" width="200" height="100" rx="12" fill="#2C2721" stroke="#C6A783" stroke-width="1.5"/>
        <text x="320" y="125" fill="#F2EDE5" font-family="sans-serif" font-size="13" font-weight="bold">SNAP-TO-NOTES</text>
        <text x="320" y="150" fill="#A79B8C" font-family="monospace" font-size="11">Llama 4 Vision</text>
        <rect x="560" y="80" width="200" height="100" rx="12" fill="#2C2721" stroke="#514638" stroke-width="1.5"/>
        <text x="580" y="125" fill="#F2EDE5" font-family="sans-serif" font-size="13" font-weight="bold">DAILY SCHEDULER</text>
        <text x="580" y="150" fill="#A79B8C" font-family="monospace" font-size="11">Time-Blocking Sync</text>
        <path d="M 240 130 L 300 130 M 500 130 L 560 130" stroke="#83796D" stroke-width="1.5" stroke-dasharray="4"/>
        <rect x="180" y="240" width="440" height="110" rx="14" fill="#1D1B18" stroke="#C6A783" stroke-width="1.5"/>
        <text x="210" y="280" fill="#C6A783" font-family="serif" font-size="15" font-weight="bold">CENTRALIZED REACTIVE STORE (localStorage)</text>
        <text x="210" y="310" fill="#A79B8C" font-family="sans-serif" font-size="12">• Shared Notepad • Calendar Blocks • To-Do Checklist</text>
        <path d="M 140 180 L 220 240 M 400 180 L 400 240 M 660 180 L 580 240" stroke="#C6A783" stroke-width="1.5"/>
      </svg>`;
    } else {
      name = 'Sprint_Action_Items_Board.png';
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400" fill="#211E1A">
        <rect width="800" height="400" fill="#211E1A" stroke="#383129" stroke-width="2"/>
        <text x="40" y="50" fill="#C6A783" font-family="serif" font-size="20" font-weight="bold">EDITORIAL SPRINT ACTION ITEMS</text>
        <rect x="50" y="90" width="210" height="260" rx="12" fill="#2C2721" stroke="#514638" stroke-width="1.5"/>
        <text x="65" y="120" fill="#C6A783" font-family="sans-serif" font-size="12" font-weight="bold">HIGH PRIORITY</text>
        <text x="65" y="150" fill="#F2EDE5" font-family="sans-serif" font-size="11">[ ] Connect Groq API key</text>
        <text x="65" y="180" fill="#F2EDE5" font-family="sans-serif" font-size="11">[ ] Deploy Llama 3.3 pipeline</text>
        <text x="65" y="210" fill="#F2EDE5" font-family="sans-serif" font-size="11">[ ] Validate vision extraction</text>
        <rect x="295" y="90" width="210" height="260" rx="12" fill="#2C2721" stroke="#514638" stroke-width="1.5"/>
        <text x="310" y="120" fill="#C6A783" font-family="sans-serif" font-size="12" font-weight="bold">IN PROGRESS</text>
        <text x="310" y="150" fill="#F2EDE5" font-family="sans-serif" font-size="11">[ ] Time-blocking scheduler</text>
        <text x="310" y="180" fill="#F2EDE5" font-family="sans-serif" font-size="11">[ ] Notepad sync drawer</text>
        <rect x="540" y="90" width="210" height="260" rx="12" fill="#2C2721" stroke="#514638" stroke-width="1.5"/>
        <text x="555" y="120" fill="#C6A783" font-family="sans-serif" font-size="12" font-weight="bold">DONE</text>
        <text x="555" y="150" fill="#A79B8C" font-family="sans-serif" font-size="11">[x] Setup Warm Minimal Palette</text>
        <text x="555" y="180" fill="#A79B8C" font-family="sans-serif" font-size="11">[x] Editorial typography system</text>
      </svg>`;
    }

    const base64Data = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));
    processAndLoadImage(base64Data, name);
  };

  // Edit Mode Sync: Directly update the saved note in the Shared Notepad
  const handleTitleChange = (newTitle: string) => {
    setExtractedTitle(newTitle);
    if (savedNoteId) {
      updateNote(savedNoteId, { title: newTitle });
    }
  };

  const handleContentChange = (newContent: string) => {
    setExtractedContent(newContent);
    if (savedNoteId) {
      updateNote(savedNoteId, { content: newContent });
    }
  };

  // Manual Save (when auto-save is toggled off)
  const handleManualSave = () => {
    if (!extractedContent) return;
    const finalTitle = extractedTitle.trim() || 'Extracted Note';
    const saved = addNote({
      title: finalTitle,
      content: extractedContent,
      tags: ['snap-to-notes', 'vision', selectedMode],
      source: 'snap-to-notes'
    });
    setSavedNoteId(saved.id);
    triggerConfetti();
    showToast(`Saved note "${saved.title}" to Notepad`, 'success', {
      label: 'Open Notepad',
      onClick: () => setIsNotepadDrawerOpen(true)
    });
  };

  const handleExtractTasksToTodoList = () => {
    if (!extractedContent) return;
    const taskRegex = /- \[ \] (.*)/g;
    let match;
    let addedCount = 0;
    while ((match = taskRegex.exec(extractedContent)) !== null) {
      const taskTitle = match[1].trim();
      if (taskTitle) {
        addTodoItem({
          title: taskTitle,
          completed: false,
          priority: 'medium',
          dueDate: new Date().toISOString().split('T')[0]
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      triggerConfetti();
      showToast(`Added ${addedCount} tasks to To-Do List`, 'success');
    } else {
      showToast('No unchecked tasks (- [ ]) found', 'info');
    }
  };

  const handleCopyNote = () => {
    if (!extractedContent) return;
    navigator.clipboard
      .writeText(`# ${extractedTitle}\n\n${extractedContent}`)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        showToast('Copied Markdown to clipboard', 'info');
      })
      .catch(() => showToast('Clipboard access denied', 'error'));
  };

  const iconsMap: Record<string, React.ReactNode> = {
    FileText: <FileText className="h-4 w-4" />,
    ScanText: <ScanText className="h-4 w-4" />,
    BookOpen: <BookOpen className="h-4 w-4" />,
    CheckSquare: <CheckSquare className="h-4 w-4" />,
    Sparkles: <Sparkles className="h-4 w-4" />
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8.5rem)] w-full space-y-6">
      {/* Editorial Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-[#C8C2B6] dark:border-theme-border bg-theme-surface p-5 shadow-warm-sm transition-colors duration-180">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-editorial text-lg sm:text-xl font-semibold text-theme-primary">
              Visual Extraction &amp; Transcriber
            </h2>
            <span className="rounded-btn bg-theme-accentLight px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-theme-accent font-semibold border border-theme-borderStrong">
              Llama 4 Vision
            </span>
          </div>
          <p className="text-xs text-theme-secondary mt-1">
            Transform whiteboard diagrams, document photographs, and screenshots into structured, permanent markdown notes.
          </p>
        </div>

        {/* Sample Diagram Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-theme-muted hidden sm:inline">Try Preset:</span>
          <button
            type="button"
            onClick={() => loadSampleImage('architecture')}
            className="rounded-btn border border-[#C8C2B6] dark:border-theme-border bg-theme-elevated px-3 py-1.5 text-xs font-medium text-theme-secondary hover:text-theme-primary hover:border-theme-borderStrong transition-all shadow-warm-sm"
          >
            System Topology
          </button>
          <button
            type="button"
            onClick={() => loadSampleImage('notes')}
            className="rounded-btn border border-[#C8C2B6] dark:border-theme-border bg-theme-elevated px-3 py-1.5 text-xs font-medium text-theme-secondary hover:text-theme-primary hover:border-theme-borderStrong transition-all shadow-warm-sm"
          >
            Sprint Task Board
          </button>
        </div>
      </div>

      {/* Main Grid: Left (Input & Modes) + Right (Output) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 columns) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Webcam Viewfinder if active */}
          {isWebcamActive && (
            <div className="rounded-card border border-theme-accent bg-theme-surface p-3.5 shadow-warm-md space-y-3 animate-fade-in">
              <div className="relative overflow-hidden rounded-input bg-black aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2.5 left-2.5 rounded bg-black/60 px-2.5 py-1 text-[10px] text-theme-accent font-mono flex items-center gap-1.5 backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-theme-accent animate-pulse" />
                  LIVE CAMERA VIEWFINDER
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={stopWebcam}
                  className="rounded-btn px-3 py-1.5 text-xs text-theme-muted hover:text-theme-primary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={captureWebcamSnapshot}
                  className="inline-flex items-center gap-1.5 rounded-btn bg-theme-brand px-4 py-2 text-xs font-semibold text-theme-surface hover:bg-theme-brandHover transition-all shadow-warm-sm"
                >
                  <Camera className="h-3.5 w-3.5 stroke-[2.5]" />
                  Capture Photo
                </button>
              </div>
            </div>
          )}

          {/* Upload Dropzone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center rounded-card border-2 border-dashed p-5 transition-all duration-200 ${
              imagePreview || documentText
                ? 'border-[#C8C2B6] dark:border-theme-border bg-theme-surface'
                : 'border-[#C8C2B6] dark:border-theme-borderStrong bg-theme-sidebar/50 hover:border-theme-accent hover:bg-theme-surface'
            }`}
          >
            {/* Hidden native inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.pdf,.txt,.md,.csv,.json"
              className="hidden"
            />
            <input
              type="file"
              ref={cameraFallbackInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />

            {imagePreview || documentText ? (
              <div className="relative w-full space-y-3">
                <div className="relative max-h-64 overflow-hidden rounded-input border border-[#C8C2B6] dark:border-theme-border bg-theme-elevated flex items-center justify-center p-2">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-60 w-auto object-contain rounded-lg shadow-warm-sm"
                    />
                  ) : (
                    <div className="w-full p-4 space-y-2 text-left">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-btn bg-theme-accentLight text-theme-accent border border-theme-borderStrong">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-theme-primary truncate">{imageName}</p>
                          <p className="text-[11px] font-mono text-theme-muted">
                            {documentMeta?.pageCount ? `${documentMeta.pageCount} page${documentMeta.pageCount > 1 ? 's' : ''} · ` : ''}
                            {(documentMeta?.charCount || documentText?.length || 0).toLocaleString()} chars extracted
                          </p>
                        </div>
                      </div>
                      <p className="text-[11px] font-mono text-theme-secondary line-clamp-4 bg-theme-surface/70 rounded-btn p-2.5 border border-theme-border">
                        {documentText?.slice(0, 320)}...
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setDocumentText(null);
                      setDocumentMeta(null);
                      setImageName('');
                      setExtractedContent('');
                      setExtractedTitle('');
                      setSavedNoteId(null);
                      setErrorAlert(null);
                    }}
                    className="absolute top-3 right-3 rounded-full bg-theme-surface/90 p-1.5 text-theme-secondary hover:text-rose-500 transition-colors shadow-warm-sm border border-[#C8C2B6] dark:border-theme-border"
                    title="Remove File"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {isCompressing && (
                    <div className="absolute inset-0 bg-theme-main/70 backdrop-blur-sm flex items-center justify-center text-xs font-mono text-theme-accent">
                      Processing file...
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-theme-muted px-1">
                  <span className="truncate max-w-[200px] font-mono text-[11px] text-theme-primary">
                    {imageName}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] text-theme-accent hover:underline font-medium"
                    >
                      Replace File
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-6 px-4 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-btn bg-theme-accentLight text-theme-accent border border-[#C8C2B6] dark:border-theme-borderStrong shadow-warm-sm">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-theme-primary">
                    Drop image, PDF, or file here, or{' '}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-theme-accent hover:underline font-semibold"
                    >
                      browse files
                    </button>
                  </p>
                  <p className="text-[11px] text-theme-muted mt-1">
                    PNG, JPG, WEBP, PDF, TXT, MD · Paste image with{' '}
                    <kbd className="rounded bg-theme-elevated px-1.5 py-0.5 font-mono text-[10px] border border-[#C8C2B6] dark:border-theme-border">
                      ⌘V
                    </kbd>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={startWebcam}
                  className="inline-flex items-center gap-1.5 rounded-btn border border-[#C8C2B6] dark:border-theme-border bg-theme-elevated px-3 py-1.5 text-xs font-medium text-theme-secondary hover:text-theme-primary hover:border-theme-borderStrong transition-colors shadow-warm-sm"
                >
                  <Camera className="h-3.5 w-3.5 text-theme-accent" />
                  Use Camera
                </button>
              </div>
            )}
          </div>

          {/* Mode Selector Card */}
          <div className="rounded-card border border-[#C8C2B6] dark:border-theme-border bg-theme-surface p-4 space-y-3.5 shadow-warm-sm">
            {/* Vision Model Selector Row matching LLM Playground & wireframe */}
            <div className="flex items-center justify-between pb-3 border-b border-[#D6D1C7] dark:border-theme-border">
              <div className="flex items-center gap-1.5">
                <span className="font-editorial text-xs font-semibold uppercase tracking-wider text-theme-muted">
                  Vision Model
                </span>
                <span className="rounded bg-theme-accent/15 px-1.5 py-0.5 text-[9px] font-mono text-theme-accent font-semibold">
                  Multimodal
                </span>
              </div>
              <div className="relative" ref={modelDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  className="inline-flex items-center gap-2.5 rounded-full border border-[#B8976C] dark:border-[#B29672] bg-theme-surface hover:bg-stone-500/10 dark:hover:bg-stone-800/40 px-3.5 py-1 text-xs text-stone-900 dark:text-[#FAF8F5] hover:border-theme-accent dark:hover:border-[#E5C158] transition-all duration-160 shadow-warm-sm group"
                >
                  <span className="font-sans font-medium text-stone-900 dark:text-[#FAF8F5] whitespace-nowrap">
                    {visionModelDisplayName}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-stone-600 dark:text-[#C4A482] group-hover:text-stone-900 dark:group-hover:text-white transition-transform duration-160 ${
                      isModelDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Model Dropdown Menu */}
                {isModelDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 rounded-card border border-[#C8C2B6] dark:border-theme-borderStrong bg-theme-surface p-2 shadow-warm-lg z-50 animate-slide-up">
                    <div className="px-3 py-1.5 border-b border-theme-border mb-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-theme-muted font-semibold">
                        Select Groq Vision Model
                      </span>
                      <span className="text-[9px] font-mono text-theme-accent font-semibold">Llama 4</span>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {availableVisionModels.map(m => {
                        const isSelected = activeVisionModelId === m.id && !isCustomVisionModel;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedVisionModel(m.id);
                              setIsCustomVisionModel(false);
                              setIsModelDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-btn px-2.5 py-2 text-left text-xs transition-colors ${
                              isSelected
                                ? 'bg-theme-accentLight text-theme-primary border border-theme-borderStrong font-semibold'
                                : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
                            }`}
                          >
                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="truncate text-xs font-medium">
                                {m.name}
                                {m.badge ? ` · ${m.badge}` : ''}
                              </span>
                              <span className="text-[10px] text-theme-muted truncate">
                                {m.description}
                              </span>
                            </div>
                            {m.badge && (
                              <span className="shrink-0 rounded-full bg-theme-sidebar px-2 py-0.5 text-[9px] font-mono text-theme-accent border border-theme-border font-medium">
                                {m.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}

                      {/* Custom Vision Model */}
                      <div className="pt-1.5 border-t border-theme-border">
                        {!isCustomVisionModel ? (
                          <button
                            type="button"
                            onClick={() => setIsCustomVisionModel(true)}
                            className="w-full text-left px-2.5 py-1.5 text-xs text-theme-accent hover:underline font-mono"
                          >
                            + Custom Vision Model ID...
                          </button>
                        ) : (
                          <div className="p-1 space-y-1.5">
                            <input
                              type="text"
                              value={customVisionModel}
                              onChange={e => setCustomVisionModel(e.target.value)}
                              placeholder="e.g. meta-llama/llama-4-scout-17b-16e-instruct"
                              className="w-full rounded-btn border border-theme-border bg-theme-elevated px-2.5 py-1 text-xs text-theme-primary focus:border-theme-accent focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => setIsModelDropdownOpen(false)}
                              className="w-full rounded-btn bg-theme-brand py-1 text-[11px] font-medium text-theme-surface"
                            >
                              Apply Custom Vision Model
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <span className="font-editorial text-xs font-semibold uppercase tracking-wider text-theme-muted block">
              Extraction Objective
            </span>

            <div className="grid grid-cols-1 gap-2">
              {EXTRACTION_PRESETS.map(preset => {
                const isSelected = selectedMode === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => setSelectedMode(preset.id)}
                    className={`cursor-pointer rounded-input border p-3 transition-all duration-160 flex items-start gap-3 ${
                      isSelected
                        ? 'border-theme-accent bg-theme-accentLight text-theme-primary shadow-warm-sm'
                        : 'border-[#C8C2B6] dark:border-theme-border bg-theme-elevated text-theme-secondary hover:border-theme-borderStrong'
                    }`}
                  >
                    <div
                      className={`mt-0.5 rounded-btn p-1.5 ${
                        isSelected
                          ? 'bg-theme-surface text-theme-accent shadow-warm-sm'
                          : 'bg-theme-sidebar text-theme-muted'
                      }`}
                    >
                      {iconsMap[preset.iconName]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{preset.label}</span>
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-theme-accent" />}
                      </div>
                      <p className="text-[11px] text-theme-secondary leading-snug mt-0.5">
                        {preset.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedMode === 'custom' && (
              <textarea
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                placeholder="Specific extraction instructions (e.g. 'Extract all key figures into a Markdown table')..."
                rows={2}
                className="w-full rounded-input border border-[#C8C2B6] dark:border-theme-border bg-theme-elevated p-2.5 text-xs text-theme-primary placeholder:text-theme-muted focus:border-theme-accent focus:outline-none"
              />
            )}

            {/* Automation Toggles */}
            <div className="space-y-2.5 pt-2 border-t border-[#D6D1C7] dark:border-theme-border">
              {/* Auto-Extract Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-theme-primary">Auto-Extract on Upload</span>
                  <span className="text-[10px] text-theme-muted">Start processing immediately upon image selection</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoExtractOnUpload}
                    onChange={e => setAutoExtractOnUpload(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-stone-300 dark:bg-theme-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-theme-brand" />
                </label>
              </div>

              {/* Auto-Save Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-theme-primary">Auto-Save to Shared Notepad</span>
                  <span className="text-[10px] text-theme-muted">Save note automatically and update counters</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSaveToNotepad}
                    onChange={e => setAutoSaveToNotepad(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-stone-300 dark:bg-theme-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-theme-brand" />
                </label>
              </div>
            </div>

            {/* Execute Primary Button */}
            <button
              type="button"
              onClick={() => triggerExtraction()}
              disabled={(!imagePreview && !documentText) || isProcessing}
              className="w-full flex h-11 items-center justify-center gap-2 rounded-btn bg-theme-brand text-xs font-semibold text-theme-surface hover:bg-theme-brandHover disabled:opacity-40 transition-all duration-160 shadow-warm-sm"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-theme-accent" />
                  <span>Extracting Main Points via Groq...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-theme-accent" />
                  <span>Extract Main Points &amp; Save to Notepad</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column (7 columns): Note Output Card */}
        <div className="lg:col-span-7 flex flex-col rounded-card border border-[#C8C2B6] dark:border-theme-border bg-theme-surface shadow-warm-sm overflow-hidden">
          {/* Note Toolbar */}
          <div className="flex items-center justify-between border-b border-[#D6D1C7] dark:border-theme-border px-5 py-3.5 bg-theme-sidebar/50">
            <div className="flex items-center gap-2">
              <span className="font-editorial text-xs font-semibold text-theme-primary">
                Generated Note Document
              </span>
              {stats && (
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-theme-secondary">
                  <span className="rounded bg-theme-elevated px-1.5 py-0.5 border border-[#C8C2B6] dark:border-theme-border">
                    {stats.latencyMs}ms
                  </span>
                  {stats.tokensPerSecond ? (
                    <span className="rounded bg-theme-accentLight text-theme-accent px-1.5 py-0.5 border border-theme-borderStrong font-semibold">
                      {stats.tokensPerSecond} tok/s
                    </span>
                  ) : null}
                  {stats.modelUsed && (
                    <span className="hidden sm:inline-block rounded bg-theme-elevated text-theme-muted px-1.5 py-0.5 border border-[#C8C2B6] dark:border-theme-border">
                      {stats.modelUsed.split('/').pop()}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                disabled={!extractedContent}
                className={`inline-flex items-center gap-1 rounded-btn px-2.5 py-1 text-xs font-medium transition-colors ${
                  isPreviewMode
                    ? 'bg-theme-accentLight text-theme-accent border border-theme-borderStrong'
                    : 'bg-theme-elevated text-theme-secondary hover:text-theme-primary border border-[#C8C2B6] dark:border-theme-border'
                } disabled:opacity-40`}
              >
                {isPreviewMode ? <Edit3 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span>{isPreviewMode ? 'Edit' : 'Preview'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyNote}
                disabled={!extractedContent}
                className="p-1.5 rounded-btn text-theme-muted hover:text-theme-primary hover:bg-theme-elevated disabled:opacity-40 transition-colors border border-[#C8C2B6] dark:border-theme-border"
                title="Copy Markdown"
              >
                {isCopied ? <Check className="h-3.5 w-3.5 text-theme-accent" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Actionable Error Alert */}
          {errorAlert && (
            <div className="m-4 flex items-start gap-3 rounded-card border border-rose-400/40 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300 animate-slide-up">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-semibold">{errorAlert.message}</p>
                {errorAlert.isKeyError && (
                  <button
                    type="button"
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-btn bg-theme-brand px-3 py-1.5 text-[11px] font-medium text-theme-surface hover:bg-theme-brandHover transition-all shadow-warm-sm"
                  >
                    <Key className="h-3 w-3" />
                    Configure Groq API Key
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Title Bar */}
          <div className="px-6 pt-4 pb-2 border-b border-[#D6D1C7] dark:border-theme-border/60">
            <input
              type="text"
              value={extractedTitle}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="Extracted Note Title..."
              disabled={!extractedContent}
              className="w-full bg-transparent font-editorial text-lg font-bold text-theme-primary placeholder:text-theme-muted focus:outline-none"
            />
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6 min-h-[320px]">
            {isProcessing ? (
              /* Editorial Loading Skeleton */
              <div className="space-y-6 animate-pulse">
                <div className="flex items-center gap-2 text-theme-accent font-mono text-xs">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Transcribing with Groq Multimodal Vision...</span>
                </div>

                <div className="space-y-3">
                  <div className="h-6 w-3/4 rounded bg-stone-300 dark:bg-theme-border/70" />
                  <div className="h-4 w-1/3 rounded bg-stone-200 dark:bg-theme-border/40" />
                </div>

                <div className="space-y-2.5 pt-2">
                  <div className="h-3.5 w-full rounded bg-stone-200 dark:bg-theme-border/40" />
                  <div className="h-3.5 w-11/12 rounded bg-stone-200 dark:bg-theme-border/40" />
                  <div className="h-3.5 w-4/5 rounded bg-stone-200 dark:bg-theme-border/40" />
                  <div className="h-3.5 w-2/3 rounded bg-stone-200 dark:bg-theme-border/40" />
                </div>

                <div className="space-y-2.5 pt-4">
                  <div className="h-4 w-1/4 rounded bg-stone-300 dark:bg-theme-border/60" />
                  <div className="h-3.5 w-full rounded bg-stone-200 dark:bg-theme-border/40" />
                  <div className="h-3.5 w-5/6 rounded bg-stone-200 dark:bg-theme-border/40" />
                </div>
              </div>
            ) : extractedContent ? (
              isPreviewMode ? (
                <MarkdownRenderer content={extractedContent} />
              ) : (
                <textarea
                  value={extractedContent}
                  onChange={e => handleContentChange(e.target.value)}
                  className="h-full w-full min-h-[260px] resize-none bg-transparent font-mono text-xs leading-relaxed text-theme-primary focus:outline-none"
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[260px] text-center text-theme-muted space-y-2">
                <ImageIcon className="h-8 w-8 stroke-1 text-theme-borderStrong" />
                <p className="font-editorial text-sm font-semibold text-theme-primary">
                  Ready for Image Input
                </p>
                <p className="text-xs text-theme-secondary max-w-sm">
                  Upload an image on the left, paste from clipboard, use camera, or select a sample preset to generate a structured editorial note.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          {extractedContent && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D6D1C7] dark:border-theme-border p-4 bg-theme-sidebar/40">
              <div className="flex items-center gap-2.5">
                {savedNoteId ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Saved to Notepad ✓
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleManualSave}
                    className="inline-flex items-center gap-1.5 rounded-btn bg-theme-brand px-4 py-2 text-xs font-semibold text-theme-surface hover:bg-theme-brandHover transition-all shadow-warm-sm"
                  >
                    <FileText className="h-3.5 w-3.5 text-theme-accent" />
                    Save to Notepad
                  </button>
                )}

                {extractedContent.includes('- [ ]') && (
                  <button
                    type="button"
                    onClick={handleExtractTasksToTodoList}
                    className="inline-flex items-center gap-1.5 rounded-btn border border-[#C8C2B6] dark:border-theme-border bg-theme-elevated px-3 py-2 text-xs font-medium text-theme-primary hover:border-theme-borderStrong transition-colors shadow-warm-sm"
                  >
                    <CheckSquare className="h-3.5 w-3.5 text-theme-accent" />
                    Extract to To-Do List
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsNotepadDrawerOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-theme-accent hover:underline font-mono"
              >
                <span>View in Notepad</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
