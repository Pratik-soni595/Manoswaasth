"""Tests for reproducible synthetic dataset generation."""

import csv
import sys
import tempfile
import unittest
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PACKAGE_ROOT))

from src.catalogue_loader import load_catalogue
from src.dataset_generator import CATEGORIES, RAW_FIELDS, generate_dataset, main, write_dataset
from src.feature_engineering import calculate_available_time, calculate_derived_features
from src.preprocessing import SUPPORTED_PRAKRITI_PROFILES, validate_user_schedule
from src.suitability_engine import rank_eligible_tasks


class TestDatasetGenerator(unittest.TestCase):
    def test_fixed_seed_is_deterministic_and_covers_profiles(self):
        self.assertEqual(generate_dataset(35, 17), generate_dataset(35, 17))
        profiles = {row["primary_dosha"] for row in generate_dataset(35, 17)}
        self.assertEqual(profiles, set(SUPPORTED_PRAKRITI_PROFILES))

    def test_row_count_and_impossible_request_fail_clearly(self):
        self.assertEqual(len(generate_dataset(8, 4)), 8)
        with self.assertRaisesRegex(ValueError, "row_count must be greater than zero"):
            generate_dataset(0, 4)
        with self.assertRaisesRegex(ValueError, "Could generate only"):
            generate_dataset(10, 4, max_attempts=1)

    def test_schedule_features_and_labels_are_valid_and_top_ranked(self):
        catalogue = load_catalogue()
        categories_by_id = {task["task_id"]: task["category"] for task in catalogue["tasks"]}
        rows = generate_dataset(100, 9)
        self.assertTrue(any(row["sleep_time"] < row["wake_time"] and row["sleep_time"] < "06:00" for row in rows))
        self.assertTrue(any(row["sleep_time"] < row["return_home_time"] for row in rows))
        for row in rows:
            schedule = {field: row[field] for field in RAW_FIELDS[1:]}
            validate_user_schedule(schedule)
            derived = calculate_derived_features(schedule)
            for key, value in derived.items():
                self.assertEqual(row[key], value)
            for category in CATEGORIES:
                task_id = row[f"label_{category}"]
                self.assertEqual(categories_by_id[task_id], category)
                available = calculate_available_time(schedule, category)
                ranked = rank_eligible_tasks(row["primary_dosha"], category, available, catalogue=catalogue)
                self.assertTrue(ranked["eligible_tasks"])
                self.assertEqual(task_id, ranked["eligible_tasks"][0]["task_id"])

    def test_cli_writes_csv(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "dataset.csv"
            self.assertEqual(main(["--rows", "5", "--seed", "11", "--output", str(output)]), 0)
            with output.open(encoding="utf-8", newline="") as handle:
                rows = list(csv.DictReader(handle))
            self.assertEqual(len(rows), 5)
            self.assertIn("label_work_break", rows[0])
            self.assertNotIn("task_id", rows[0])


if __name__ == "__main__":
    unittest.main()
