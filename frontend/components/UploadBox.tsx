"use client";

import { useId, useRef, useState } from "react";

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface SpeechRecognitionEventLike extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

export type InputSourceType = "auto" | "email" | "invoice" | "note";

export interface QueuedInputFile {
  id: string;
  name: string;
  sizeLabel: string;
  text?: string;
  mimeType?: string;
  isDemo?: boolean;
  sourceType?: InputSourceType;
}

interface UploadBoxProps {
  queuedFiles: QueuedInputFile[];
  pastedText: string;
  voiceTranscript: string;
  pastedTextSourceType: InputSourceType;
  voiceTranscriptSourceType: InputSourceType;
  onFilesChange: (files: QueuedInputFile[]) => void;
  onPastedTextChange: (value: string) => void;
  onVoiceTranscriptChange: (value: string) => void;
  onPastedTextSourceTypeChange: (value: InputSourceType) => void;
  onVoiceTranscriptSourceTypeChange: (value: InputSourceType) => void;
  onRun: () => void;
  onLoadDemo: () => void;
  isRunning: boolean;
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function detectSourceType(name: string, text: string, mimeType: string): InputSourceType {
  const loweredName = name.toLowerCase();
  const loweredText = text.toLowerCase();
  const loweredMimeType = mimeType.toLowerCase();

  if (
    loweredName.includes("invoice") ||
    loweredText.includes("invoice #") ||
    (loweredText.includes("amount due") && loweredText.includes("due date"))
  ) {
    return "invoice";
  }

  if (
    loweredMimeType.includes("message") ||
    loweredName.includes("email") ||
    loweredText.includes("subject:") ||
    loweredText.includes("from:")
  ) {
    return "email";
  }

  if (
    loweredName.includes("note") ||
    loweredName.includes("sop") ||
    loweredText.includes("playbook") ||
    loweredText.includes("same day") ||
    loweredText.includes("reminder cadence")
  ) {
    return "note";
  }

  return "auto";
}

const SOURCE_TYPE_OPTIONS: Array<{ value: InputSourceType; label: string }> = [
  { value: "auto", label: "Auto-detect" },
  { value: "email", label: "Customer email" },
  { value: "invoice", label: "Invoice" },
  { value: "note", label: "Note / SOP" },
];

export function UploadBox({
  queuedFiles,
  pastedText,
  voiceTranscript,
  pastedTextSourceType,
  voiceTranscriptSourceType,
  onFilesChange,
  onPastedTextChange,
  onVoiceTranscriptChange,
  onPastedTextSourceTypeChange,
  onVoiceTranscriptSourceTypeChange,
  onRun,
  onLoadDemo,
  isRunning,
}: UploadBoxProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micMessage, setMicMessage] = useState("Optional voice note");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const addFiles = async (incomingFiles: FileList | File[]) => {
    const nextFiles = await Promise.all(
      Array.from(incomingFiles).map(async (file, index) => {
        const text = await file.text();
        return {
          id: `${file.name}-${file.lastModified}-${index}`,
          name: file.name,
          sizeLabel: formatFileSize(file.size),
          text,
          mimeType: file.type || "text/plain",
          sourceType: detectSourceType(file.name, text, file.type || "text/plain"),
        };
      }),
    );

    const existingFiles = queuedFiles.filter(
      (existingFile) => !nextFiles.some((nextFile) => nextFile.id === existingFile.id),
    );
    onFilesChange([...existingFiles, ...nextFiles]);
  };

  const updateFileSourceType = (fileId: string, sourceType: InputSourceType) => {
    onFilesChange(
      queuedFiles.map((file) => (file.id === fileId ? { ...file, sourceType } : file)),
    );
  };

  const handleMic = () => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setMicMessage("Speech input is not available in this browser.");
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (transcript) {
        onVoiceTranscriptChange(transcript);
        setMicMessage("Voice note captured for review.");
      }
    };
    recognition.onerror = () => {
      setMicMessage("Voice input could not be captured. You can still type or paste.");
    };
    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setMicMessage("Listening...");
  };

  const hasInputs =
    queuedFiles.length > 0 || pastedText.trim().length > 0 || voiceTranscript.trim().length > 0;

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="kicker">Intake</p>
          <h2>Run a daily brief</h2>
        </div>
        <button className="button button-secondary" type="button" onClick={onLoadDemo}>
          Load demo inputs
        </button>
      </div>

      <div className="intake-grid">
        <div className="accordion-list">
          <details className="input-accordion" open>
            <summary className="input-accordion-summary">
              <div>
                <p className="kicker">Uploaded files</p>
                <h3>Documents and exports</h3>
              </div>
              <span className="chip">{queuedFiles.length} files</span>
            </summary>
            <div className="input-accordion-body">
              <div
                className={`upload-zone${isDragging ? " drag-active" : ""}`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  if (event.dataTransfer.files.length > 0) {
                    void addFiles(event.dataTransfer.files);
                  }
                }}
              >
                <input
                  id={inputId}
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(event) => {
                    if (event.target.files) {
                      void addFiles(event.target.files);
                    }
                  }}
                />
                <div className="input-actions">
                  <label className="upload-trigger" htmlFor={inputId}>
                    Upload files
                  </label>
                  <span className="upload-note">
                    Drop notes, invoices, exports, or demo files here to prepare the brief.
                  </span>
                </div>

                {queuedFiles.length > 0 ? (
                  <div className="upload-list">
                    {queuedFiles.map((file) => (
                      <div className="upload-item" key={file.id}>
                        <div className="upload-item-meta">
                          <strong>{file.name}</strong>
                          <span>{file.sizeLabel}</span>
                        </div>
                        <div className="source-row">
                          <span className="helper-copy">Treat as</span>
                          <select
                            className="source-select"
                            value={file.sourceType ?? "auto"}
                            onChange={(event) =>
                              updateFileSourceType(file.id, event.target.value as InputSourceType)
                            }
                          >
                            {SOURCE_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="helper-copy">No files queued yet.</p>
                )}
              </div>
            </div>
          </details>

          <details className="input-accordion" open={Boolean(pastedText)}>
            <summary className="input-accordion-summary">
              <div>
                <p className="kicker">Paste text</p>
                <h3>Notes or copied messages</h3>
              </div>
              <span className="chip">{pastedText.trim() ? "Added" : "Empty"}</span>
            </summary>
            <div className="input-accordion-body">
              <div className="source-row">
                <span className="helper-copy">Treat as</span>
                <select
                  className="source-select"
                  value={pastedTextSourceType}
                  onChange={(event) =>
                    onPastedTextSourceTypeChange(event.target.value as InputSourceType)
                  }
                >
                  {SOURCE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                className="paste-box"
                placeholder="Paste a customer email, founder note, invoice summary, or operating context."
                value={pastedText}
                onChange={(event) => onPastedTextChange(event.target.value)}
              />
            </div>
          </details>

          <details className="input-accordion" open={Boolean(voiceTranscript)}>
            <summary className="input-accordion-summary">
              <div>
                <p className="kicker">Voice input</p>
                <h3>Optional voice note</h3>
              </div>
              <span className="chip">{voiceTranscript.trim() ? "Captured" : "Optional"}</span>
            </summary>
            <div className="input-accordion-body">
              <div className="source-row">
                <span className="helper-copy">Treat as</span>
                <select
                  className="source-select"
                  value={voiceTranscriptSourceType}
                  onChange={(event) =>
                    onVoiceTranscriptSourceTypeChange(event.target.value as InputSourceType)
                  }
                >
                  {SOURCE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mic-row">
                <button className="button button-outline" type="button" onClick={handleMic}>
                  {isRecording ? "Stop listening" : "Use microphone"}
                </button>
                <span className="helper-copy">{micMessage}</span>
              </div>
              <textarea
                className="paste-box"
                placeholder="Voice transcript will appear here for review."
                value={voiceTranscript}
                onChange={(event) => onVoiceTranscriptChange(event.target.value)}
              />
            </div>
          </details>
        </div>

        <div className="run-row">
          <button
            className="button button-primary"
            type="button"
            onClick={onRun}
            disabled={isRunning}
          >
            {isRunning ? "Preparing brief..." : "Run Daily Brief"}
          </button>
          <span className="helper-copy">
            The output stays reviewable and does not imply anything was sent or updated automatically.
          </span>
        </div>

        <p className="intake-note">
          If auto-detection is wrong, force the source type here before running the brief.
        </p>

        {!hasInputs ? (
          <div className="helper-copy">
            Add demo files, paste text, or capture a short voice note to run the prototype.
          </div>
        ) : null}
      </div>
    </section>
  );
}
