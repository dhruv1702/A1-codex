import type { ReceiptItem, SelectableInsight } from "@/lib/api";

interface ReceiptPanelProps {
  selectedInsight: SelectableInsight | null;
  receipts: ReceiptItem[];
}

export function ReceiptPanel({ selectedInsight, receipts }: ReceiptPanelProps) {
  const linkedReceiptIds = new Set(selectedInsight?.receiptIds ?? []);
  const linkedReceipts = receipts.filter((receipt) => linkedReceiptIds.has(receipt.id));

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="kicker">Evidence</p>
          <h2>Why this was recommended</h2>
        </div>
        <span className="chip">{selectedInsight ? `${linkedReceipts.length} linked` : "Select an item"}</span>
      </div>

      {selectedInsight ? (
        <div className="focus-panel">
          <p className="kicker">Selected item</p>
          <h3 className="focus-title">{selectedInsight.title}</h3>
          <p className="focus-copy">{selectedInsight.rationale}</p>
          <div className="evidence-stack">
            {selectedInsight.whyItMatters.map((reason) => (
              <div className="evidence-quote" key={reason}>
                <span className="evidence-label">Why it matters</span>
                <p>{reason}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="focus-panel empty">Select a recommendation or card item to inspect the supporting receipts.</div>
      )}

      {selectedInsight ? (
        <div className="receipt-list">
          {linkedReceipts.map((receipt) => (
            <article className="receipt-item is-highlighted" key={receipt.id}>
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
              <div className="evidence-stack">
                <div className="evidence-quote">
                  <span className="evidence-label">Source excerpt</span>
                  <p>{receipt.excerpt}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
