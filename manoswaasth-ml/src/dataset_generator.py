"""Generate deterministic synthetic rows labeled by the suitability engine."""

import argparse
import csv
import random
import sys
from pathlib import Path
from typing import Dict, List, Optional

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from src.catalogue_loader import load_catalogue
from src.feature_engineering import calculate_available_time, calculate_derived_features
from src.preprocessing import SUPPORTED_PRAKRITI_PROFILES, validate_user_schedule
from src.suitability_engine import rank_eligible_tasks

CATEGORIES = ("work_break", "after_work", "before_bed", "after_waking")
RAW_FIELDS = ("primary_dosha", "break_start", "break_end", "return_home_time", "sleep_time", "wake_time")
DERIVED_FIELDS = ("break_duration", "sleep_duration", "available_after_work")
TARGET_FIELDS = tuple(f"label_{category}" for category in CATEGORIES)
DEFAULT_OUTPUT = PACKAGE_ROOT / "data" / "dincharya_synthetic_dataset.csv"


def _format_time(minutes: int) -> str:
    minutes %= 24 * 60
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def _synthetic_schedule(rng: random.Random, index: int) -> Dict[str, str]:
    break_start = rng.randrange(10 * 60, 16 * 60, 15)
    break_duration = rng.choice((3, 4, 5, 10, 15, 20, 30))
    home = rng.randrange(16 * 60, 23 * 60, 15)
    # Include both conventional bedtimes and after-midnight bedtimes. Gaps are
    # large enough to make at least one after-work task eligible.
    gap = rng.choice((60, 120, 180, 240, 300, 360, 420, 480, 540))
    sleep = home + gap
    sleep_duration = rng.choice((360, 390, 420, 450, 480, 510, 540))
    return {
        "break_start": _format_time(break_start),
        "break_end": _format_time(break_start + break_duration),
        "return_home_time": _format_time(home),
        "sleep_time": _format_time(sleep),
        "wake_time": _format_time(sleep + sleep_duration),
    }


def generate_dataset(row_count: int = 1000, seed: int = 42, max_attempts: Optional[int] = None) -> List[Dict[str, object]]:
    """Return accepted rows with one top-ranked eligible label per category."""
    if row_count <= 0:
        raise ValueError("row_count must be greater than zero.")
    attempt_limit = max_attempts if max_attempts is not None else max(1000, row_count * 100)
    if attempt_limit <= 0:
        raise ValueError("max_attempts must be greater than zero.")

    rng = random.Random(seed)
    catalogue = load_catalogue()
    task_categories = {task["task_id"]: task["category"] for task in catalogue["tasks"]}
    rows: List[Dict[str, object]] = []
    seen = set()

    for attempt in range(attempt_limit):
        if len(rows) == row_count:
            break
        profile = SUPPORTED_PRAKRITI_PROFILES[len(rows) % len(SUPPORTED_PRAKRITI_PROFILES)]
        schedule = _synthetic_schedule(rng, attempt)
        try:
            validate_user_schedule(schedule)
            derived = calculate_derived_features(schedule)
        except ValueError:
            continue

        signature = (profile, *(schedule[field] for field in RAW_FIELDS[1:]))
        if signature in seen:
            continue

        labels = {}
        for category in CATEGORIES:
            available = calculate_available_time(schedule, category)
            ranked = rank_eligible_tasks(profile, category, available, catalogue=catalogue)["eligible_tasks"]
            if not ranked:
                break
            task_id = ranked[0]["task_id"]
            if task_categories.get(task_id) != category:
                raise ValueError(f"Suitability engine returned {task_id} for unexpected category {category}.")
            labels[f"label_{category}"] = task_id
        if len(labels) != len(CATEGORIES):
            continue

        seen.add(signature)
        rows.append({
            "primary_dosha": profile,
            **{field: schedule[field] for field in RAW_FIELDS[1:]},
            **derived,
            **labels,
        })

    if len(rows) != row_count:
        raise ValueError(
            f"Could generate only {len(rows)} of {row_count} unique labeled rows after "
            f"{attempt_limit} attempts. Increase max_attempts or request fewer rows."
        )
    return rows


def write_dataset(rows: List[Dict[str, object]], output_path: Path) -> None:
    """Write rows in a stable, documented column order."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fields = list(RAW_FIELDS) + list(DERIVED_FIELDS) + list(TARGET_FIELDS)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rows", type=int, default=1000, help="number of accepted rows (default: 1000)")
    parser.add_argument("--seed", type=int, default=42, help="deterministic random seed (default: 42)")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help=f"CSV output path (default: {DEFAULT_OUTPUT})")
    args = parser.parse_args(argv)
    try:
        rows = generate_dataset(args.rows, args.seed)
        write_dataset(rows, args.output)
    except (ValueError, OSError) as exc:
        parser.error(str(exc))
    print(f"Wrote {len(rows)} rows (seed={args.seed}) to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
