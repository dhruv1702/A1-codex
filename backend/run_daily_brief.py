from __future__ import annotations

from collections import defaultdict
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.agents.common import slugify
from backend.agents.customer_relations_agent import run_customer_relations_agent
from backend.agents.finance_agent import run_finance_agent
from backend.agents.inbox_agent import run_inbox_agent
from backend.agents.orchestrator import create_daily_brief


def build_daily_brief(business_state: dict) -> dict:
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [
            executor.submit(run_inbox_agent, business_state),
            executor.submit(run_finance_agent, business_state),
            executor.submit(run_customer_relations_agent, business_state),
        ]
    agent_outputs = [future.result() for future in futures]
    parser_review_output = build_parser_review_output(business_state)
    if any(parser_review_output[key] for key in ("risks", "recommended_actions", "receipts")):
        agent_outputs.append(parser_review_output)
    return create_daily_brief(agent_outputs)


def build_parser_review_output(business_state: dict[str, Any]) -> dict[str, Any]:
    source_map = business_state.get("source_map")
    unknowns = business_state.get("unknowns")
    if not isinstance(source_map, dict) or not isinstance(unknowns, list):
        return _empty_agent_output()

    unknowns_by_source: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for unknown in unknowns:
        if not isinstance(unknown, dict):
            continue
        source_id = unknown.get("source_id")
        if not source_id:
            continue
        unknowns_by_source[str(source_id)].append(unknown)

    risks: list[dict[str, Any]] = []
    recommended_actions: list[dict[str, Any]] = []
    receipts: list[dict[str, Any]] = []

    for source_id, source_unknowns in unknowns_by_source.items():
        source_entry = source_map.get(source_id, {}) if isinstance(source_map.get(source_id), dict) else {}
        source_title = str(source_entry.get("title") or source_id)
        source_type = str(source_entry.get("source_type") or "note")
        missing_fields = [str(unknown.get("field_name") or "field") for unknown in source_unknowns]
        receipt_ids: list[str] = []

        for unknown in source_unknowns[:4]:
            field_name = str(unknown.get("field_name") or "field")
            reason = str(unknown.get("reason") or f"Could not extract {field_name}.")
            receipt_id = f"receipt-parser-{slugify(f'{source_id}-{field_name}')}"
            receipts.append(
                {
                    "id": receipt_id,
                    "title": f"Missing {field_name.replace('_', ' ')}",
                    "source_id": source_id,
                    "source_name": source_title,
                    "source_type": source_type,
                    "excerpt": reason,
                }
            )
            receipt_ids.append(receipt_id)

        summary = _unknown_summary(source_type, missing_fields, source_title)
        priority = 2 if _has_critical_missing_fields(source_type, missing_fields) else 3
        item_id = f"parser-review-{slugify(source_id)}"

        risks.append(
            {
                "id": f"risk-{item_id}",
                "title": f"Review extraction gaps in {source_title}",
                "summary": summary,
                "priority": priority,
                "receipt_ids": receipt_ids,
                "owner": "ops",
                "due": None,
                "source_agents": ["parser_review"],
                "status": "open",
            }
        )
        recommended_actions.append(
            {
                "id": f"action-{item_id}",
                "title": f"Resolve missing fields in {source_title}",
                "summary": "Confirm the missing document details before relying on this item in the operating brief.",
                "priority": priority,
                "receipt_ids": receipt_ids,
                "owner": "ops",
                "due": "before acting",
                "source_agents": ["parser_review"],
                "status": "pending_review",
            }
        )

    return {
        "agent": "parser_review",
        "executive_summary": [],
        "ops": [],
        "finance": [],
        "customer_comms": [],
        "risks": risks,
        "recommended_actions": recommended_actions,
        "drafts": [],
        "receipts": receipts,
    }


def _has_critical_missing_fields(source_type: str, missing_fields: list[str]) -> bool:
    critical_by_type = {
        "invoice": {"invoice_number", "amount", "due_date", "company_name"},
        "email": {"company_name", "contact_email", "date"},
        "note": {"commitments"},
    }
    critical_fields = critical_by_type.get(source_type, set())
    return any(field in critical_fields for field in missing_fields)


def _unknown_summary(source_type: str, missing_fields: list[str], source_title: str) -> str:
    formatted_fields = ", ".join(field.replace("_", " ") for field in missing_fields[:3])
    if source_type == "invoice":
        return f"The parser could not confirm {formatted_fields} in {source_title}. Validate the invoice details before collections follow-up."
    if source_type == "email":
        return f"The parser could not confirm {formatted_fields} in {source_title}. Verify the contact context before replying."
    if source_type == "note":
        return f"The parser could not turn {source_title} into clear operating commitments. Review the note before relying on it."
    return f"The parser could not confirm {formatted_fields} in {source_title}. Review the document before acting on it."


def _empty_agent_output() -> dict[str, Any]:
    return {
        "agent": "parser_review",
        "executive_summary": [],
        "ops": [],
        "finance": [],
        "customer_comms": [],
        "risks": [],
        "recommended_actions": [],
        "drafts": [],
        "receipts": [],
    }


def main() -> int:
    input_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("business_state.json")
    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("daily_brief.json")

    with input_path.open("r", encoding="utf-8") as infile:
        business_state = json.load(infile)

    daily_brief = build_daily_brief(business_state)

    with output_path.open("w", encoding="utf-8") as outfile:
        json.dump(daily_brief, outfile, indent=2)
        outfile.write("\n")

    print(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
