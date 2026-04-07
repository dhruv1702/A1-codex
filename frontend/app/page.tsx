"use client";

import { useEffect, useRef, useState } from "react";
import { BriefCard } from "@/components/BriefCard";
import { InputSourceType, QueuedInputFile, UploadBox } from "@/components/UploadBox";
import {
  BriefSectionItem,
  DailyBrief,
  DailyBriefInput,
  DraftItem,
  ReceiptItem,
  RecommendedAction,
  SelectableInsight,
  fetchDailyBrief,
} from "@/lib/api";

const demoFiles: QueuedInputFile[] = [
  {
    id: "demo-acme-email",
    name: "acme-shipment-delay-email.txt",
    sizeLabel: "2 KB",
    sourceType: "email",
  },
  {
    id: "demo-invoice",
    name: "invoice-1042.txt",
    sizeLabel: "1 KB",
    sourceType: "invoice",
  },
  {
    id: "demo-founder-note",
    name: "founder-fulfillment-note.md",
    sizeLabel: "2 KB",
    sourceType: "note",
  },
];

const demoPasteText =
  "Founder note: keep customer updates specific, make recommendation reasons easy to inspect, and review any company record updates before applying them.";

function findLinkedReceipts(
  selectedInsight: SelectableInsight | null,
  receipts: ReceiptItem[],
): ReceiptItem[] {
  const linkedReceiptIds = new Set(selectedInsight?.receiptIds ?? []);
  return receipts.filter((receipt) => linkedReceiptIds.has(receipt.id));
}

function findActiveDraft(
  selectedInsight: SelectableInsight | null,
  drafts: DraftItem[],
): DraftItem | null {
  if (drafts.length === 0) {
    return null;
  }

  if (!selectedInsight) {
    return drafts[0];
  }

  const directMatch = drafts.find((draft) => draft.relatedActionId === selectedInsight.id);
  if (directMatch) {
    return directMatch;
  }

  const linkedReceiptIds = new Set(selectedInsight.receiptIds);
  const receiptMatch = drafts.find((draft) =>
    draft.receiptIds.some((receiptId) => linkedReceiptIds.has(receiptId)),
  );
  if (receiptMatch) {
    return receiptMatch;
  }

  return drafts[0];
}

export default function Page() {
  const bootedFromQuery = useRef(false);
  const [queuedFiles, setQueuedFiles] = useState<QueuedInputFile[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [pastedTextSourceType, setPastedTextSourceType] = useState<InputSourceType>("auto");
  const [voiceTranscriptSourceType, setVoiceTranscriptSourceType] =
    useState<InputSourceType>("note");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<SelectableInsight | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleForInlineInput = (
    kind: "pasted" | "voice",
    sourceType: InputSourceType,
  ): string => {
    if (kind === "voice") {
      if (sourceType === "email") {
        return "Voice-dictated customer email";
      }
      if (sourceType === "invoice") {
        return "Voice-dictated invoice note";
      }
      if (sourceType === "note") {
        return "Voice note";
      }
      return "Voice note transcript";
    }

    if (sourceType === "email") {
      return "Pasted customer email";
    }
    if (sourceType === "invoice") {
      return "Pasted invoice text";
    }
    if (sourceType === "note") {
      return "Pasted operating note";
    }
    return "Pasted text";
  };

  const buildLiveInputs = (): DailyBriefInput[] => {
    const fileInputs = queuedFiles
      .filter((file) => file.text && file.text.trim().length > 0)
      .map((file) => ({
        sourceId: file.id,
        title: file.name,
        text: file.text ?? "",
        sourceType:
          file.sourceType && file.sourceType !== "auto" ? file.sourceType : undefined,
      }));

    const textInputs: DailyBriefInput[] = [];

    if (pastedText.trim()) {
      textInputs.push({
        sourceId: "pasted-note",
        title: titleForInlineInput("pasted", pastedTextSourceType),
        text: pastedText.trim(),
        sourceType: pastedTextSourceType !== "auto" ? pastedTextSourceType : undefined,
      });
    }

    if (voiceTranscript.trim()) {
      textInputs.push({
        sourceId: "voice-note",
        title: titleForInlineInput("voice", voiceTranscriptSourceType),
        text: voiceTranscript.trim(),
        sourceType:
          voiceTranscriptSourceType !== "auto" ? voiceTranscriptSourceType : undefined,
      });
    }

    return [...fileInputs, ...textInputs];
  };

  const runBrief = async (options?: { useMock?: boolean }) => {
    setIsRunning(true);
    setError(null);

    try {
      const nextBrief = await fetchDailyBrief(
        options?.useMock || isDemoMode ? { useMock: true } : { inputs: buildLiveInputs() },
      );
      setBrief(nextBrief);
      setSelectedInsight(
        nextBrief.recommendedActions[0] ?? nextBrief.cards.ops.items[0] ?? null,
      );
    } catch (runError) {
      setError(
        runError instanceof Error ? runError.message : "Unable to load the daily brief.",
      );
    } finally {
      setIsRunning(false);
    }
  };

  const handleLoadDemo = () => {
    setQueuedFiles(demoFiles);
    setPastedText(demoPasteText);
    setVoiceTranscript(
      "Please summarize what needs review today and show why each recommendation was made.",
    );
    setPastedTextSourceType("note");
    setVoiceTranscriptSourceType("note");
    setIsDemoMode(true);
  };

  const handleFilesChange = (files: QueuedInputFile[]) => {
    setQueuedFiles(files);
    setIsDemoMode(false);
  };

  const handlePastedTextChange = (value: string) => {
    setPastedText(value);
    setIsDemoMode(false);
  };

  const handleVoiceTranscriptChange = (value: string) => {
    setVoiceTranscript(value);
    setIsDemoMode(false);
  };

  const handlePastedTextSourceTypeChange = (value: InputSourceType) => {
    setPastedTextSourceType(value);
    setIsDemoMode(false);
  };

  const handleVoiceTranscriptSourceTypeChange = (value: InputSourceType) => {
    setVoiceTranscriptSourceType(value);
    setIsDemoMode(false);
  };

  useEffect(() => {
    if (bootedFromQuery.current || typeof window === "undefined") {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    if (!searchParams.has("demo")) {
      return;
    }

    bootedFromQuery.current = true;
    handleLoadDemo();

    if (searchParams.has("run") || searchParams.has("compiled")) {
      void runBrief({ useMock: true });
    }
  }, []);

  const linkedReceipts = brief ? findLinkedReceipts(selectedInsight, brief.receipts) : [];
  const activeDraft = brief ? findActiveDraft(selectedInsight, brief.drafts) : null;
  const selectedAction =
    brief?.recommendedActions.find((action) => action.id === selectedInsight?.id) ?? null;

  const renderActionItem = (action: RecommendedAction, index: number) => {
    const isSelected = selectedInsight?.id === action.id;

    return (
      <button
        key={action.id}
        className={`action-item${isSelected ? " is-selected" : ""}`}
        type="button"
        onClick={() => setSelectedInsight(action)}
      >
        <div className="agenda-index">{String(index + 1).padStart(2, "0")}</div>
        <div className="todo-body">
          <div className="action-head">
            <div>
              <strong className="card-item-title">{action.title}</strong>
              <p className="action-rationale">{action.rationale}</p>
            </div>
            <span className="action-priority" data-priority={action.priority}>
              {action.priority}
            </span>
          </div>
          <div className="tag-row">
            <span className="tag">{action.owner}</span>
            <span className="tag">{action.status}</span>
            <span className="tag">{action.requiresReview ? "Needs review" : "Ready"}</span>
          </div>
        </div>
      </button>
    );
  };

  const renderCard = (sectionKey: keyof DailyBrief["cards"]) => {
    if (!brief) {
      return null;
    }

    return (
      <BriefCard
        key={sectionKey}
        sectionKey={sectionKey}
        card={brief.cards[sectionKey]}
        selectedItemId={selectedInsight?.id ?? null}
        onSelect={(item: BriefSectionItem) => setSelectedInsight(item)}
      />
    );
  };

  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="headline-lockup">
          <p className="eyebrow">Inbox to Ops Brief</p>
          <h1>Today&apos;s operator desk</h1>
          <p className="topbar-copy">
            Work one business issue at a time. Keep the next move, the reply draft, and the exact
            receipts in one place.
          </p>
        </div>

        <div className="topbar-meta">
          <div className="meta-card">
            <p className="meta-label">Brief date</p>
            <p className="meta-value">{brief?.briefDate ?? "Waiting for input"}</p>
          </div>
          <div className="meta-card">
            <p className="meta-label">Operator queue</p>
            <p className="meta-value">{brief ? `${brief.recommendedActions.length} actions` : "Not built"}</p>
          </div>
          <div className="meta-card">
            <p className="meta-label">Drafts ready</p>
            <p className="meta-value">{brief ? `${brief.drafts.length} prepared` : "Pending"}</p>
          </div>
        </div>
      </header>

      <div className="operator-layout">
        <aside className="left-rail">
          <section className="panel action-panel">
            <div className="panel-head">
              <div>
                <p className="kicker">Today&apos;s agenda</p>
                <h2>Do these next</h2>
              </div>
              <span className="chip">
                {brief ? `${brief.recommendedActions.length} suggestions` : "Waiting"}
              </span>
            </div>

            {error ? <p className="helper-copy">{error}</p> : null}

            {brief ? (
              <div className="action-list">{brief.recommendedActions.map(renderActionItem)}</div>
            ) : (
              <p className="helper-copy">
                Load the demo set or add inputs, then run the brief. The left rail becomes your
                operating queue once the brief is compiled.
              </p>
            )}
          </section>

          <UploadBox
            queuedFiles={queuedFiles}
            pastedText={pastedText}
            voiceTranscript={voiceTranscript}
            pastedTextSourceType={pastedTextSourceType}
            voiceTranscriptSourceType={voiceTranscriptSourceType}
            onFilesChange={handleFilesChange}
            onPastedTextChange={handlePastedTextChange}
            onVoiceTranscriptChange={handleVoiceTranscriptChange}
            onPastedTextSourceTypeChange={handlePastedTextSourceTypeChange}
            onVoiceTranscriptSourceTypeChange={handleVoiceTranscriptSourceTypeChange}
            onRun={runBrief}
            onLoadDemo={handleLoadDemo}
            isRunning={isRunning}
          />
        </aside>

        <section className="operator-main">
          <section className="panel hero-panel">
            <div className="hero-head">
              <div>
                <p className="kicker">
                  {selectedAction ? "Current priority" : brief ? "Selected signal" : "Daily brief"}
                </p>
                <h2>{selectedInsight?.title ?? brief?.reportTitle ?? "What needs attention today"}</h2>
              </div>
              {brief ? (
                <div className="hero-badges">
                  {selectedAction ? (
                    <>
                      <span className="chip">{selectedAction.priority} priority</span>
                      <span className="chip">{selectedAction.owner}</span>
                      <span className="chip">{selectedAction.status}</span>
                    </>
                  ) : (
                    <span className="chip">Select an agenda item</span>
                  )}
                </div>
              ) : null}
            </div>

            {brief ? (
              <>
                <div className="hero-grid">
                  <div>
                    <h3 className="summary-title">{brief.executiveSummary.headline}</h3>
                    <p className="summary-copy">
                      {selectedInsight?.rationale ?? brief.executiveSummary.body}
                    </p>
                    <div className="status-line">
                      {brief.agentRuns.map((agent) => (
                        <span className="status-pill" key={agent.id}>
                          <span className="status-dot" aria-hidden="true" />
                          {agent.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="summary-points">
                    {brief.executiveSummary.keyPoints.map((point) => (
                      <div className="summary-point" key={point.label}>
                        <strong>{point.label}</strong>
                        <span>{point.value}</span>
                        <span>{point.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="summary-copy">
                Start with three messy inputs: one customer message, one invoice, and one note or
                SOP. The workspace will turn into a single operating surface once the brief is
                ready.
              </p>
            )}
          </section>

          {brief ? (
            <div className="focus-grid">
              <section className="panel focus-panel">
                <div className="panel-head">
                  <div>
                    <p className="kicker">Why this is on today&apos;s desk</p>
                    <h3>Working notes</h3>
                  </div>
                  <span className="chip">
                    {selectedInsight ? `${selectedInsight.receiptIds.length} linked sources` : "No selection"}
                  </span>
                </div>

                {selectedInsight ? (
                  <>
                    <div className="focus-lead">
                      <strong className="focus-title">{selectedInsight.title}</strong>
                      <p className="focus-copy">{selectedInsight.rationale}</p>
                    </div>
                    <div className="reason-list">
                      {selectedInsight.whyItMatters.map((reason) => (
                        <div className="reason-item" key={reason}>
                          <span className="reason-marker" aria-hidden="true">
                            /
                          </span>
                          <p>{reason}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="helper-copy">
                    Pick an action or lane item to turn this area into the working context for that
                    issue.
                  </p>
                )}
              </section>

              <section className="panel draft-stage">
                <div className="panel-head">
                  <div>
                    <p className="kicker">Prepared reply</p>
                    <h3>Draft for review</h3>
                  </div>
                  <span className="chip">{activeDraft ? activeDraft.reviewStatus : "No linked draft"}</span>
                </div>

                {activeDraft ? (
                  <>
                    <div className="draft-stage-head">
                      <div>
                        <strong className="draft-title">{activeDraft.title}</strong>
                        <p className="draft-copy">{activeDraft.summary}</p>
                      </div>
                      <div className="tag-row">
                        <span className="tag">{activeDraft.channel}</span>
                        <span className="tag">Human review</span>
                      </div>
                    </div>
                    <pre className="draft-body">{activeDraft.body}</pre>
                    <div className="tag-row">
                      {activeDraft.sourceLabels.map((label) => (
                        <span className="tag" key={label}>
                          {label}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="helper-copy">
                    No draft is linked to the current selection yet. Customer-facing drafts appear
                    here when the brief has one ready.
                  </p>
                )}
              </section>
            </div>
          ) : null}

          {brief ? (
            <section className="panel evidence-panel-inline">
              <div className="panel-head">
                <div>
                  <p className="kicker">Evidence trail</p>
                  <h3>Exact excerpts behind the current move</h3>
                </div>
                <span className="chip">
                  {selectedInsight ? `${linkedReceipts.length} linked` : "Select an item"}
                </span>
              </div>

              {selectedInsight ? (
                <div className="evidence-grid">
                  {linkedReceipts.map((receipt) => (
                    <article className="evidence-card" key={receipt.id}>
                      <div className="receipt-head">
                        <div>
                          <strong className="receipt-title">{receipt.title}</strong>
                          <div className="receipt-meta">
                            <span className="tag">{receipt.kind}</span>
                            <span className="tag">{receipt.sourceName}</span>
                          </div>
                        </div>
                        <span className="chip">{receipt.reference}</span>
                      </div>
                      <p className="receipt-copy">{receipt.summary}</p>
                      <div className="evidence-quote">
                        <span className="evidence-label">Source excerpt</span>
                        <p>{receipt.excerpt}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="helper-copy">
                  Select an action or lane item to inspect the exact source material behind it.
                </p>
              )}
            </section>
          ) : null}

          {brief ? (
            <section className="lane-section">
              <div className="lane-head">
                <div>
                  <p className="kicker">Secondary scan</p>
                  <h2>Ops, finance, customer comms, and risks</h2>
                </div>
                <span className="chip">4 lanes</span>
              </div>
              <div className="brief-grid">
                {(["ops", "finance", "comms", "risks"] as const).map(renderCard)}
              </div>
            </section>
          ) : null}

          {brief && brief.proposedUpdates.length > 0 ? (
            <section className="panel updates-panel">
              <div className="update-head">
                <div>
                  <p className="kicker">Review queue</p>
                  <h2>Confirm before updating records</h2>
                </div>
                <span className="chip">{brief.proposedUpdates.length} items</span>
              </div>

              <div className="update-list">
                {brief.proposedUpdates.map((update) => (
                  <article className="update-item" key={update.id}>
                    <strong className="card-item-title">{update.field}</strong>
                    <p className="update-copy">{update.reason}</p>
                    <div className="tag-row">
                      <span className="tag">Current: {update.currentValue}</span>
                      <span className="tag">Proposed: {update.proposedValue}</span>
                      <span className="tag">
                        {update.requiresHumanReview ? "Human review required" : "Ready"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}
