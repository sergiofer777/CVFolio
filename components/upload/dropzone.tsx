"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, ImageIcon, X, CheckCircle2, ExternalLink } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { MinigameCanvas } from "./minigame-canvas";

interface DropzoneProps {
  onUploadComplete: (portfolioId: string) => void;
  onError: (error: string) => void;
}

type UploadStatus = "idle" | "uploading" | "processing" | "done" | "error";
type ViewMode = "upload" | "minigame";

interface FilePreview {
  file: File;
  preview: string;
}

const STEP_LABELS = [
  "Subiendo archivo a la nube",
  "Extrayendo texto con IA",
  "Estructurando información",
  "Generando portafolio",
];

const TOTAL_DURATION = 20_000; // 20 seconds

export function Dropzone({ onUploadComplete, onError }: DropzoneProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [showMinigame, setShowMinigame] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("upload");
  const [portfolioId, setPortfolioId] = useState<string | null>(null);

  // Refs for timers so we can clean them up
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const apiDoneRef = useRef(false);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const finishUpload = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);
    setActiveStep(4);
    setShowMinigame(false);
    setStatus("done");
  }, []);

  const startProgressTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    apiDoneRef.current = false;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const fraction = Math.min(elapsed / TOTAL_DURATION, 1);

      // Progress advances to ~95% over 20 seconds, holds until API is done
      const pct = Math.min(fraction * 95, 95);
      setProgress(Math.round(pct));

      // Step progression
      if (fraction < 0.2) setActiveStep(0);
      else if (fraction < 0.5) setActiveStep(1);
      else if (fraction < 0.8) setActiveStep(2);
      else setActiveStep(3);

      // At 20 seconds, finish
      if (fraction >= 1) {
        // If API is done, show result. Otherwise wait for it.
        if (apiDoneRef.current) {
          finishUpload();
        } else {
          // Just keep at 95% until API completes
          setProgress(95);
          // Check again shortly
        }
      }
    }, 100);
  }, [finishUpload]);

  const processFile = useCallback(
    async (file: File) => {
      setStatus("uploading");
      setProgress(5);
      setActiveStep(0);
      setShowMinigame(true);

      startProgressTimer();

      try {
        const formData = new FormData();
        formData.append("file", file);

        setStatus("processing");

        const response = await fetch("/api/parse-cv", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error ?? "Error desconocido");
        }

        // Mark API as done
        apiDoneRef.current = true;
        setPortfolioId(result.portfolioId);

        // If timer already hit 20s, finish now
        const elapsed = Date.now() - startTimeRef.current;
        if (elapsed >= TOTAL_DURATION) {
          finishUpload();
        }
        // otherwise the interval will catch it
      } catch (err) {
        if (timerRef.current) clearInterval(timerRef.current);
        setShowMinigame(false);
        setStatus("error");
        onError(err instanceof Error ? err.message : "Error al procesar el archivo");
      }
    },
    [onError, startProgressTimer, finishUpload]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const preview =
        file.type === "application/pdf" ? "" : URL.createObjectURL(file);

      setFilePreview({ file, preview });
      processFile(file);
    },
    [processFile]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: {
        "application/pdf": [".pdf"],
        "image/jpeg": [".jpg", ".jpeg"],
        "image/png": [".png"],
      },
      maxSize: 10 * 1024 * 1024,
      multiple: false,
      disabled:
        status === "uploading" || status === "processing" || status === "done",
    });

  const reset = () => {
    if (filePreview?.preview) URL.revokeObjectURL(filePreview.preview);
    if (timerRef.current) clearInterval(timerRef.current);
    setFilePreview(null);
    setStatus("idle");
    setProgress(0);
    setActiveStep(0);
    setShowMinigame(false);
    setPortfolioId(null);
    setViewMode("upload");
  };

  // Handle "Ver portafolio"
  const handleViewPortfolio = () => {
    if (portfolioId) onUploadComplete(portfolioId);
  };

  // Handle "Seguir jugando"
  const handleKeepPlaying = () => {
    setViewMode("minigame");
  };

  // Handle "Back to CV" from standalone minigame
  const handleBackToCV = () => {
    setViewMode("upload");
  };

  // ── Standalone minigame mode (after result, user chose "Seguir jugando") ──
  if (viewMode === "minigame" && status === "done") {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl p-6 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_12px_40px_rgba(0,0,0,0.06)]">
          <MinigameCanvas standalone onBackToCV={handleBackToCV} />
        </div>
      </div>
    );
  }

  // ── Processing / done / error states ──
  if (filePreview && status !== "idle") {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_12px_40px_rgba(0,0,0,0.06)]">
          {/* File header */}
          <div className="flex items-center gap-3 p-3.5 bg-[var(--paper)] rounded-lg border border-[var(--sand)] mb-5">
            <div className="w-9 h-9 bg-[rgba(192,68,10,0.1)] rounded-md flex items-center justify-center flex-shrink-0">
              {filePreview.file.type === "application/pdf" ? (
                <FileText className="w-[18px] h-[18px] text-[var(--rust)]" />
              ) : (
                <ImageIcon className="w-[18px] h-[18px] text-[var(--rust)]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.85rem] font-medium text-[var(--ink)] truncate">
                {filePreview.file.name}
              </p>
              <p className="text-[0.75rem] text-[var(--muted-color)]">
                {formatFileSize(filePreview.file.size)}
              </p>
            </div>
            {status !== "processing" && status !== "uploading" && (
              <button
                onClick={reset}
                className="flex-shrink-0 text-[var(--muted-color)] hover:text-[var(--ink)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Progress bar (always visible during upload/processing) */}
          {(status === "uploading" || status === "processing") && (
            <div className="space-y-4">
              <div className="h-[3px] bg-[var(--cream)] rounded overflow-hidden">
                <div
                  className="h-full bg-[var(--rust)] rounded transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex flex-col gap-3 mb-4">
                {STEP_LABELS.map((label, i) => {
                  const isDone = i < activeStep;
                  const isActive = i === activeStep;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 text-[0.85rem] transition-colors ${
                        isDone
                          ? "text-[var(--rust)]"
                          : isActive
                          ? "text-[var(--ink)]"
                          : "text-[var(--muted-color)]"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all text-[0.65rem] font-semibold ${
                          isDone
                            ? "border-[var(--rust)] bg-[var(--rust)] text-white"
                            : isActive
                            ? "border-[var(--rust)] bg-[rgba(192,68,10,0.08)]"
                            : "border-[var(--sand)]"
                        }`}
                      >
                        {isDone ? (
                          "\u2713"
                        ) : isActive ? (
                          <span className="w-2.5 h-2.5 border-2 border-[var(--rust)] border-t-transparent rounded-full animate-spin" />
                        ) : null}
                      </div>
                      {label}
                    </div>
                  );
                })}
              </div>

              {/* Minigame area */}
              {showMinigame && (
                <div className="pt-4 border-t border-[var(--sand)]">
                  <p className="text-[0.72rem] tracking-[0.08em] uppercase text-[var(--muted-color)] font-medium mb-3 text-center">
                    Mientras esperas...
                  </p>
                  <MinigameCanvas />
                </div>
              )}
            </div>
          )}

          {/* Done */}
          {status === "done" && (
            <div className="space-y-4 animate-fade-up">
              <div className="flex items-center gap-2 text-sm text-[var(--rust)]">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-medium">
                  ¡Portafolio generado con éxito!
                </span>
              </div>

              <button
                onClick={handleViewPortfolio}
                className="w-full flex items-center justify-center gap-2.5 bg-[var(--ink)] text-[var(--paper)] py-3.5 rounded-lg hover:bg-[var(--rust)] transition-all hover:-translate-y-0.5 font-medium text-[0.9rem]"
              >
                <ExternalLink className="w-4 h-4" />
                Ver portafolio
              </button>

              <button
                onClick={handleKeepPlaying}
                className="w-full flex items-center justify-center gap-2 bg-transparent text-[var(--muted-color)] py-3 rounded-lg border border-[var(--sand)] hover:border-[var(--ink)] hover:text-[var(--ink)] hover:bg-[var(--cream)] transition-all text-[0.85rem] font-medium"
              >
                Seguir jugando 🎮
              </button>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--rust)]">
                Hubo un error al procesar el archivo.
              </p>
              <button
                onClick={reset}
                className="px-4 py-2 rounded bg-[var(--paper)] text-[var(--ink)] border border-[var(--sand)] text-sm font-medium hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-all"
              >
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Drop zone idle ──
  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative w-full max-w-md mx-auto bg-white rounded-2xl p-10 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_12px_40px_rgba(0,0,0,0.06)] cursor-pointer transition-all duration-200"
      )}
    >
      <input {...getInputProps()} />

      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 text-center transition-all",
          isDragActive && !isDragReject &&
            "border-[var(--rust)] bg-[rgba(192,68,10,0.03)]",
          isDragReject && "border-red-500 bg-red-50",
          !isDragActive && "border-[var(--sand)] bg-[var(--paper)]"
        )}
      >
        <div
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-300",
            isDragActive && !isDragReject
              ? "bg-[rgba(192,68,10,0.1)] scale-110 -translate-y-1"
              : "bg-[var(--cream)]",
            isDragReject && "bg-red-100"
          )}
        >
          <Upload
            className={cn(
              "w-6 h-6 transition-colors",
              isDragActive && !isDragReject
                ? "text-[var(--rust)]"
                : "text-[var(--muted-color)]",
              isDragReject && "text-red-500"
            )}
          />
        </div>

        <div className="space-y-1.5">
          {isDragReject ? (
            <p className="font-display font-medium text-red-500">
              Formato no soportado
            </p>
          ) : isDragActive ? (
            <p className="font-display font-medium text-[var(--rust)]">
              Suelta el archivo aquí
            </p>
          ) : (
            <>
              <p className="font-display text-lg text-[var(--ink)] tracking-tight">
                Arrastra tu CV aquí
              </p>
              <p className="text-[0.82rem] text-[var(--muted-color)]">
                o{" "}
                <span className="text-[var(--rust)] font-medium underline underline-offset-2">
                  haz clic para seleccionar
                </span>
              </p>
            </>
          )}
        </div>

        <div className="flex gap-2 mt-1">
          {["PDF", "JPG", "PNG"].map((fmt) => (
            <span
              key={fmt}
              className="bg-[var(--cream)] text-[var(--muted-color)] text-[0.7rem] tracking-[0.05em] uppercase px-2.5 py-1 rounded-full font-medium"
            >
              {fmt}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
