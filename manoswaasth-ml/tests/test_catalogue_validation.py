"""
Unit tests for Catalogue Schema and Domain Integrity Validation
"""

import unittest
import sys
from pathlib import Path

# Add src to path for module discovery
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.catalogue_loader import load_catalogue, validate_catalogue

EXPECTED_CATEGORY_COUNTS = {
    "work_break": 8,
    "after_work": 9,
    "before_bed": 9,
    "after_waking": 9,
}


class TestCatalogueValidation(unittest.TestCase):
    def setUp(self):
        self.catalogue = load_catalogue()
        self.tasks = self.catalogue.get("tasks", [])

    def test_total_task_count_is_35(self):
        """Verify that the catalogue contains exactly 35 activities."""
        self.assertEqual(len(self.tasks), 35)

    def test_category_distribution(self):
        """Verify the exact distribution across the 4 categories."""
        counts = {}
        for task in self.tasks:
            cat = task.get("category")
            counts[cat] = counts.get(cat, 0) + 1

        self.assertEqual(counts, EXPECTED_CATEGORY_COUNTS)

    def test_unique_task_ids(self):
        """Verify that every task has a unique task_id."""
        task_ids = [t["task_id"] for t in self.tasks]
        self.assertEqual(len(task_ids), len(set(task_ids)))

    def test_dosha_affinity_completeness_and_bounds(self):
        """Verify every task contains vata, pitta, kapha affinities within 1-3."""
        for task in self.tasks:
            task_id = task.get("task_id")
            affinities = task.get("dosha_affinity", {})
            self.assertIn("vata", affinities, f"Task {task_id} missing vata")
            self.assertIn("pitta", affinities, f"Task {task_id} missing pitta")
            self.assertIn("kapha", affinities, f"Task {task_id} missing kapha")

            for dosha in ("vata", "pitta", "kapha"):
                val = affinities[dosha]
                self.assertIn(
                    val,
                    [1, 2, 3],
                    f"Task {task_id} has invalid {dosha} affinity: {val} (must be 1, 2, or 3)",
                )

    def test_positive_duration_minutes(self):
        """Verify that all activity durations are positive numbers."""
        for task in self.tasks:
            task_id = task.get("task_id")
            duration = task.get("duration_minutes")
            self.assertIsNotNone(duration, f"Task {task_id} missing duration")
            self.assertGreater(duration, 0, f"Task {task_id} duration must be > 0")

    def test_safety_restrictions_present(self):
        """Verify that safety_restrictions field exists on all tasks."""
        for task in self.tasks:
            task_id = task.get("task_id")
            self.assertIn(
                "safety_restrictions",
                task,
                f"Task {task_id} missing safety_restrictions metadata",
            )
            self.assertIsInstance(
                task["safety_restrictions"],
                list,
                f"Task {task_id} safety_restrictions must be a list",
            )

    def test_corrupted_catalogue_validation(self):
        """Verify validator flags invalid task count or missing fields."""
        # Non-dict
        with self.assertRaises(ValueError):
            validate_catalogue("not-a-dict")

        # Wrong count
        bad_catalogue = {"tasks": self.tasks[:10]}
        with self.assertRaises(ValueError):
            validate_catalogue(bad_catalogue)


if __name__ == "__main__":
    unittest.main()

