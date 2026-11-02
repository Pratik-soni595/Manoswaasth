"""
Unit tests for Time Calculations and Time Eligibility Filtering
"""

import unittest
import sys
from pathlib import Path

# Add src to path for module discovery
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.feature_engineering import (
    calculate_available_time,
    calculate_derived_features,
    calculate_duration_minutes,
)
from src.suitability_engine import filter_eligible_tasks


class TestTimeFiltering(unittest.TestCase):
    def setUp(self):
        self.sample_tasks = [
            {"task_id": "BR01", "category": "work_break", "duration_minutes": 2},
            {"task_id": "BR02", "category": "work_break", "duration_minutes": 3},
            {"task_id": "BR03", "category": "work_break", "duration_minutes": 5},
            {"task_id": "HM01", "category": "after_work", "duration_minutes": 10},
        ]

    def test_filter_exact_fit(self):
        """Activity duration exactly matches available time."""
        filtered = filter_eligible_tasks(self.sample_tasks, "work_break", 3)
        task_ids = [t["task_id"] for t in filtered]
        self.assertIn("BR02", task_ids)
        self.assertIn("BR01", task_ids)
        self.assertNotIn("BR03", task_ids)

    def test_filter_duration_shorter(self):
        """Activity duration is strictly shorter than available time."""
        filtered = filter_eligible_tasks(self.sample_tasks, "work_break", 4)
        task_ids = [t["task_id"] for t in filtered]
        self.assertEqual(sorted(task_ids), ["BR01", "BR02"])

    def test_filter_duration_exceeds(self):
        """Activities whose duration exceeds available time are excluded."""
        filtered = filter_eligible_tasks(self.sample_tasks, "work_break", 1)
        self.assertEqual(len(filtered), 0)

    def test_filter_zero_or_negative_time(self):
        """Zero or negative available time must return empty list."""
        filtered_zero = filter_eligible_tasks(self.sample_tasks, "work_break", 0)
        self.assertEqual(filtered_zero, [])

        filtered_neg = filter_eligible_tasks(self.sample_tasks, "work_break", -10)
        self.assertEqual(filtered_neg, [])

    def test_filter_category_mismatch(self):
        """Activities from different categories must be excluded."""
        filtered = filter_eligible_tasks(self.sample_tasks, "work_break", 15)
        task_ids = [t["task_id"] for t in filtered]
        self.assertNotIn("HM01", task_ids)

    def test_midnight_crossing_sleep_duration(self):
        """
        Verify midnight crossing calculations:
        Sleep: 23:00 to 07:00 -> 480 minutes (8 hours)
        """
        duration = calculate_duration_minutes("23:00", "07:00", allow_midnight_crossing=True)
        self.assertEqual(duration, 480)

    def test_evening_duration_same_day(self):
        """
        Verify evening available time:
        Returning home: 18:30, Sleep time: 23:00 -> 270 minutes (4.5 hours)
        """
        duration = calculate_duration_minutes("18:30", "23:00", allow_midnight_crossing=True)
        self.assertEqual(duration, 270)

    def test_evening_duration_crossing_midnight(self):
        """
        Returning home late (e.g. 23:30) and sleeping at 01:00 -> 90 minutes
        """
        duration = calculate_duration_minutes("23:30", "01:00", allow_midnight_crossing=True)
        self.assertEqual(duration, 90)

    def test_derived_features_pipeline(self):
        """Test complete derived feature calculation from schedule."""
        schedule = {
            "break_start": "13:00",
            "break_end": "13:45",
            "return_home_time": "18:30",
            "sleep_time": "23:00",
            "wake_time": "07:00",
        }
        derived = calculate_derived_features(schedule)
        self.assertEqual(derived["break_duration"], 45)
        self.assertEqual(derived["sleep_duration"], 480)
        self.assertEqual(derived["available_after_work"], 270)

    def test_calculate_available_time_categories(self):
        """Verify available time resolution across categories."""
        schedule = {
            "break_start": "13:00",
            "break_end": "13:30",
            "return_home_time": "18:30",
            "sleep_time": "23:00",
            "wake_time": "07:00",
        }
        self.assertEqual(calculate_available_time(schedule, "work_break"), 30)
        self.assertEqual(calculate_available_time(schedule, "after_work"), 270)
        self.assertEqual(calculate_available_time(schedule, "before_bed"), 15)
        self.assertEqual(calculate_available_time(schedule, "after_waking"), 15)

    def test_invalid_and_contradictory_times(self):
        """Contradictory times (e.g. break_end <= break_start) must raise ValueError."""
        with self.assertRaises(ValueError):
            calculate_duration_minutes("13:30", "13:00", allow_midnight_crossing=False)

        with self.assertRaises(ValueError):
            calculate_duration_minutes("13:00", "13:00", allow_midnight_crossing=False)

        with self.assertRaises(ValueError):
            calculate_duration_minutes("25:00", "07:00")

        with self.assertRaises(ValueError):
            calculate_duration_minutes("invalid", "07:00")


if __name__ == "__main__":
    unittest.main()

