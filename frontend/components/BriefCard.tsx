import type { BriefSectionCard, BriefSectionItem, BriefSectionKey } from "@/lib/api";

interface BriefCardProps {
  sectionKey: BriefSectionKey;
  card: BriefSectionCard;
  selectedItemId: string | null;
  onSelect: (item: BriefSectionItem) => void;
}

export function BriefCard({ sectionKey, card, selectedItemId, onSelect }: BriefCardProps) {
  return (
    <article className="brief-card" data-tone={sectionKey}>
      <div className="panel-head">
        <div>
          <p className="kicker">{card.label}</p>
          <h3>{card.title}</h3>
        </div>
        <span className="chip">{card.items.length} items</span>
      </div>
      <p className="helper-copy">{card.subtitle}</p>

      <div className="card-list">
        {card.items.map((item) => (
          <button
            key={item.id}
            className={`card-item${selectedItemId === item.id ? " is-selected" : ""}`}
            type="button"
            onClick={() => onSelect(item)}
          >
            <div className="card-item-head">
              <strong className="card-item-title">{item.title}</strong>
              <span className="chip">{item.status}</span>
            </div>
            <p className="card-item-copy">{item.copy}</p>
            <div className="tag-row">
              {item.tags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </article>
  );
}
