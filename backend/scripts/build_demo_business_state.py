"""Build backend/data/demo_inputs/business_state.json from the demo fixtures."""

import json
import sys
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DEMO_REFERENCE_DATE = date(2026, 4, 7)


def ensure_repo_root_on_path() -> Path:
    if str(ROOT) not in sys.path:
        sys.path.insert(0, str(ROOT))
    return ROOT


def demo_data_dir() -> Path:
    return ROOT / "backend" / "data" / "demo_inputs"


def build_demo_business_state() -> dict:
    ensure_repo_root_on_path()

    from backend.ingestion.build_business_state import SourceDocument, build_business_state

    data_dir = demo_data_dir()

    sources = [
        SourceDocument(
            source_id="email_acme_shipment_delay",
            source_type="email",
            title="ACME shipment delay email",
            text=(data_dir / "customer_email.txt").read_text(),
        ),
        SourceDocument(
            source_id="invoice_1042_bluebird",
            source_type="invoice",
            title="Invoice #1042",
            text=(data_dir / "invoice_1042.txt").read_text(),
        ),
        SourceDocument(
            source_id="note_founder_fulfillment",
            source_type="note",
            title="Founder fulfillment note",
            text=(data_dir / "founder_note.md").read_text(),
        ),
    ]

    return build_business_state(sources, reference_date=DEMO_REFERENCE_DATE)


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n")


def main() -> None:
    output_path = demo_data_dir() / "business_state.json"
    business_state = build_demo_business_state()
    write_json(output_path, business_state)
    print("Wrote %s" % output_path.relative_to(ROOT))


if __name__ == "__main__":
    main()
