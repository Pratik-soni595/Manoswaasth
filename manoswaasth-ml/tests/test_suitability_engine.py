"""
Unit tests for the Suitability Scoring Engine (Context Scoring, Weighted Final Scoring, Ranking)
"""

import unittest
import sys
from pathlib import Path

# Add src to path for module discovery
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.suitability_engine import (
    calculate_context_score,
    calculate_final_score,
    rank_eligible_tasks,
)


class TestSuitabilityEngine(unittest.TestCase):
    def test_context_scoring_formula(self):
        """
        Verify context score calculation:
        Available break duration = 3 minutes.
        Activity duration = 2 minutes.
        Budget cap for work_break = 5 minutes.
        Slot budget = min(3, 5) = 3 minutes.
        Context Score = (2 / 3) * 100 = 66.67.
        """
        task = {"task_id": "T01", "category": "work_break", "duration_minutes": 2}
        score = calculate_context_score(task, available_minutes=3, category="work_break")
        self.assertEqual(score, 66.67)

    def test_context_scoring_capped_by_category_budget(self):
        """
        When available time exceeds category max budget:
        Available break duration = 15 minutes.
        Category budget cap = 5 minutes.
        Slot budget = min(15, 5) = 5 minutes.
        Task duration = 5 minutes -> (5 / 5) * 100 = 100.00.
        Task duration = 3 minutes -> (3 / 5) * 100 = 60.00.
        """
        task_5m = {"task_id": "T05", "category": "work_break", "duration_minutes": 5}
        task_3m = {"task_id": "T03", "category": "work_break", "duration_minutes": 3}

        score_5m = calculate_context_score(task_5m, available_minutes=15, category="work_break")
        score_3m = calculate_context_score(task_3m, available_minutes=15, category="work_break")

        self.assertEqual(score_5m, 100.00)
        self.assertEqual(score_3m, 60.00)

    def test_context_scoring_duration_exceeds_available(self):
        """If duration exceeds available time, context score is 0.0."""
        task = {"task_id": "T05", "category": "work_break", "duration_minutes": 5}
        score = calculate_context_score(task, available_minutes=3, category="work_break")
        self.assertEqual(score, 0.0)

    def test_final_scoring_weighted_example(self):
        """
        Verify the exact worked example in Section 5C:
        Dosha Score = 83.33
        Context Score = 66.67
        Final Score = (0.70 * 83.33) + (0.30 * 66.67) = 58.331 + 20.001 = 78.33
        """
        final = calculate_final_score(83.33, 66.67)
        self.assertEqual(final, 78.33)

    def test_final_scoring_bounds(self):
        """Final score must be bounded between 0.00 and 100.00."""
        self.assertEqual(calculate_final_score(0.0, 0.0), 0.00)
        self.assertEqual(calculate_final_score(100.0, 100.0), 100.00)

        with self.assertRaises(ValueError):
            calculate_final_score(-5.0, 50.0)

        with self.assertRaises(ValueError):
            calculate_final_score(50.0, 105.0)

    def test_deterministic_tie_breaking(self):
        """
        When two tasks produce identical final scores, tie-breaking must sort
        by task_id alphabetically.
        """
        tasks = [
            {
                "task_id": "BR09",
                "title": "Task B",
                "category": "work_break",
                "duration_minutes": 3,
                "dosha_affinity": {"vata": 2, "pitta": 2, "kapha": 2},
                "safety_restrictions": [],
            },
            {
                "task_id": "BR02",
                "title": "Task A",
                "category": "work_break",
                "duration_minutes": 3,
                "dosha_affinity": {"vata": 2, "pitta": 2, "kapha": 2},
                "safety_restrictions": [],
            },
        ]

        result = rank_eligible_tasks(
            prakriti="vata",
            category="work_break",
            available_minutes=5,
            tasks=tasks,
        )

        ranked = result["eligible_tasks"]
        self.assertEqual(len(ranked), 2)
        self.assertEqual(ranked[0]["final_score"], ranked[1]["final_score"])
        # BR02 must come before BR09 alphabetically
        self.assertEqual(ranked[0]["task_id"], "BR02")
        self.assertEqual(ranked[1]["task_id"], "BR09")

    def test_empty_eligible_tasks_explanation(self):
        """
        When no activities fit, return an empty eligible_tasks list and a clear explanation.
        """
        tasks = [
            {
                "task_id": "BR01",
                "title": "Task 5m",
                "category": "work_break",
                "duration_minutes": 5,
                "dosha_affinity": {"vata": 3, "pitta": 3, "kapha": 3},
                "safety_restrictions": [],
            }
        ]

        # Available time 1 min -> cannot fit 5m task
        result = rank_eligible_tasks(
            prakriti="vata",
            category="work_break",
            available_minutes=1,
            tasks=tasks,
        )

        self.assertEqual(result["eligible_tasks"], [])
        self.assertIn("No activities found", result["explanation"])


if __name__ == "__main__":
    unittest.main()

