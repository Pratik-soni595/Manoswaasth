"""
Manoswaasth - Personalised Dincharya Recommendation System
Independent Suitability Scoring Engine CLI & Demonstration Runner
"""

import json
from pprint import pprint
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from src.catalogue_loader import load_catalogue
from src.feature_engineering import calculate_available_time, calculate_derived_features
from src.suitability_engine import (
    calculate_context_score,
    calculate_dosha_score,
    calculate_final_score,
    rank_eligible_tasks,
)


def evaluate_daily_schedule(
    prakriti: str,
    schedule: dict,
    catalogue: dict,
    default_bedtime_budget: int = 15,
    default_morning_budget: int = 15,
) -> dict:
    """
    Evaluate and rank eligible activities for all four Dincharya categories
    given a user's Prakriti and daily schedule.
    """
    categories = ["work_break", "after_work", "before_bed", "after_waking"]
    derived_features = calculate_derived_features(schedule)

    results = {
        "prakriti": prakriti,
        "schedule_inputs": schedule,
        "derived_features": derived_features,
        "recommendations": {},
    }

    for cat in categories:
        avail_mins = calculate_available_time(
            user_schedule=schedule,
            category=cat,
            default_bedtime_budget=default_bedtime_budget,
            default_morning_budget=default_morning_budget,
        )
        ranked = rank_eligible_tasks(
            prakriti=prakriti,
            category=cat,
            available_minutes=avail_mins,
            catalogue=catalogue,
        )
        results["recommendations"][cat] = ranked

    return results


def run_worked_example():
    """Demonstrate the exact scoring formula with a worked example."""
    print("=" * 80)
    print("WORKED SCORING EXAMPLE (Section 5 Spec)")
    print("=" * 80)
    print("Hypothetical Task Dosha Affinity: Vata = 3, Pitta = 2, Kapha = 1")
    print("Prakriti: Vata-Pitta (Dual-Dosha)")
    print("Work Break Available Time: 3 minutes")
    print("Activity Duration: 2 minutes")
    print("-" * 80)

    sample_task = {
        "task_id": "EX01",
        "title": "Mindful Breathing Adaptation",
        "category": "work_break",
        "duration_minutes": 2,
        "dosha_affinity": {"vata": 3, "pitta": 2, "kapha": 1},
    }

    # Step 1: Dosha Suitability Score
    # Formula: ((Affinity 1 + Affinity 2) / 2) / 3 * 100
    # = ((3 + 2) / 2) / 3 * 100 = (2.5 / 3) * 100 = 83.33
    dosha_score = calculate_dosha_score("vata-pitta", sample_task)
    print(f"1. Dosha Suitability Score : {dosha_score:.2f} / 100")
    print("   Calculation: ((3 [Vata] + 2 [Pitta]) / 2) / 3 * 100 = 83.33")

    # Step 2: Context Suitability Score
    # Slot budget = min(available_minutes, max_budget) = min(3, 5) = 3 minutes
    # Formula: (Activity Duration / Slot Budget) * 100 = (2 / 3) * 100 = 66.67
    context_score = calculate_context_score(sample_task, available_minutes=3, category="work_break")
    print(f"2. Context Suitability Score: {context_score:.2f} / 100")
    print("   Calculation: (2 minutes duration / 3 minutes slot budget) * 100 = 66.67")

    # Step 3: Final Suitability Score (70:30 weighted)
    # Formula: (0.70 * Dosha Score) + (0.30 * Context Score)
    # = (0.70 * 83.33) + (0.30 * 66.67) = 58.331 + 20.001 = 78.332 -> 78.33
    final_score = calculate_final_score(dosha_score, context_score)
    print(f"3. Final Suitability Score  : {final_score:.2f} / 100")
    print(f"   Calculation: (0.70 * {dosha_score:.2f}) + (0.30 * {context_score:.2f}) = {final_score:.2f}")
    print("=" * 80 + "\n")


def print_slot_summary(cat_key: str, cat_data: dict):
    """Pretty-print a category's ranked recommendation list."""
    avail = cat_data["available_minutes"]
    tasks = cat_data["eligible_tasks"]
    print(f"\n  Category: {cat_key.upper()} (Available: {avail} mins | Eligible: {len(tasks)})")
    if not tasks:
        print(f"    Notice: {cat_data.get('explanation')}")
        return

    print(f"    {'Rank':<4} {'ID':<6} {'Title':<32} {'Dur':<5} {'Dosha':<7} {'Context':<8} {'Final':<7}")
    print(f"    {'-'*4} {'-'*6} {'-'*32} {'-'*5} {'-'*7} {'-'*8} {'-'*7}")
    for idx, t in enumerate(tasks[:4], start=1):  # display top 4
        print(
            f"    {idx:<4} {t['task_id']:<6} {t['title'][:32]:<32} "
            f"{t['duration_minutes']}m   "
            f"{t['dosha_score']:<7.2f} {t['context_score']:<8.2f} {t['final_score']:<7.2f}"
        )


def main():
    print("=" * 80)
    print("MANOSWAASTH DINCHARYA SUITABILITY SCORING ENGINE")
    print("=" * 80)

    # 1. Load and validate catalogue
    catalogue = load_catalogue()
    print(f"[OK] Task catalogue loaded & validated successfully ({len(catalogue['tasks'])} tasks).")

    # 2. Show worked example
    run_worked_example()

    # 3. Demonstrate sample evaluations across 3 distinct Prakriti profiles:
    # Profile A: Vata (Single-dosha)
    # Profile B: Pitta-Kapha (Dual-dosha)
    # Profile C: Vata-Pitta-Kapha (Triple-dosha)
    test_cases = [
        {
            "label": "Profile A (Single-Dosha: Vata)",
            "prakriti": "vata",
            "schedule": {
                "break_start": "13:00",
                "break_end": "13:15",        # 15 min break (slot cap 5 min)
                "return_home_time": "18:30",
                "sleep_time": "23:00",       # 270 min evening
                "wake_time": "06:30",        # 450 min sleep (crossing midnight)
            },
        },
        {
            "label": "Profile B (Dual-Dosha: Pitta-Kapha)",
            "prakriti": "pitta-kapha",
            "schedule": {
                "break_start": "13:00",
                "break_end": "13:03",        # Short 3 min break
                "return_home_time": "19:00",
                "sleep_time": "23:30",       # 270 min evening
                "wake_time": "07:00",        # 450 min sleep
            },
        },
        {
            "label": "Profile C (Triple-Dosha: Vata-Pitta-Kapha)",
            "prakriti": "vata-pitta-kapha",
            "schedule": {
                "break_start": "12:30",
                "break_end": "12:50",        # 20 min break
                "return_home_time": "20:00",
                "sleep_time": "00:30",       # 270 min evening (crosses midnight)
                "wake_time": "07:30",        # 420 min sleep
            },
        },
    ]

    for tc in test_cases:
        print("=" * 80)
        print(f"EVALUATION: {tc['label']}")
        print("=" * 80)
        eval_result = evaluate_daily_schedule(
            prakriti=tc["prakriti"],
            schedule=tc["schedule"],
            catalogue=catalogue,
        )

        derived = eval_result["derived_features"]
        print(
            f"Derived Features -> Break: {derived['break_duration']}m | "
            f"Sleep: {derived['sleep_duration']}m | Available Evening: {derived['available_after_work']}m"
        )

        for cat_key, cat_data in eval_result["recommendations"].items():
            print_slot_summary(cat_key, cat_data)
        print()

    # 4. Show sample JSON output matching Section 10 specification
    print("=" * 80)
    print("SAMPLE JSON OUTPUT (Single Recommendation Category: work_break)")
    print("=" * 80)
    sample_ranked = rank_eligible_tasks(
        prakriti="vata-pitta",
        category="work_break",
        available_minutes=3,
        catalogue=catalogue,
    )
    print(json.dumps(sample_ranked, indent=2))
    print("=" * 80)


if __name__ == "__main__":
    main()
