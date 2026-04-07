import type { DraftItem } from "@/lib/api";

interface DraftPanelProps {
  drafts: DraftItem[];
}

export function DraftPanel({ drafts }: DraftPanelProps) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="kicker">Drafts</p>
          <h2>Prepared for review</h2>
        </div>
        <span className="chip">{drafts.length} prepared</span>
      </div>

      <div className="draft-list">
        {drafts.map((draft) => (
          <article className="draft-item" key={draft.id}>
            <div className="draft-head">
              <div>
                <strong className="draft-title">{draft.title}</strong>
                <div className="draft-meta">
                  <span className="tag">{draft.channel}</span>
                  <span className="tag">{draft.reviewStatus}</span>
                </div>
              </div>
              <span className="chip">Needs review</span>
            </div>
            <p className="draft-copy">{draft.summary}</p>
            <div className="tag-row">
              {draft.sourceLabels.map((label) => (
                <span className="tag" key={label}>
                  {label}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
