"""Generate all demo JSON artifacts used by backend and frontend."""

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.run_daily_brief import build_daily_brief
from backend.scripts.build_demo_business_state import build_demo_business_state, demo_data_dir, write_json


def main() -> None:
    business_state = build_demo_business_state()
    daily_brief = build_daily_brief(business_state)

    backend_data_dir = demo_data_dir()
    frontend_demo_dir = ROOT / "frontend" / "public" / "demo"

    artifacts = {
        backend_data_dir / "business_state.json": business_state,
        backend_data_dir / "daily_brief.json": daily_brief,
        frontend_demo_dir / "daily_brief.json": daily_brief,
    }

    for path, payload in artifacts.items():
        write_json(path, payload)
        print("Wrote %s" % path.relative_to(ROOT))


if __name__ == "__main__":
    main()
