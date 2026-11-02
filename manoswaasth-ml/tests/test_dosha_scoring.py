"""
Unit tests for Dosha Suitability Scoring
"""

import unittest
import sys
from pathlib import Path

# Add src to path for module discovery
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.suitability_engine import calculate_dosha_score
from src.preprocessing import normalize_prakriti


class TestDoshaScoring(unittest.TestCase):
    def setUp(self):
        # Reference sample task from prompt Section 5A:
        # Vata = 3, Pitta = 2, Kapha = 1
        self.sample_task = {
            "task_id": "TEST01",
            "title": "Reference Sample Activity",
            "category": "work_break",
            "duration_minutes": 3,
            "dosha_affinity": {
                "vata": 3,
                "pitta": 2,
                "kapha": 1,
            },
        }

    def test_single_dosha_scoring(self):
        """Test single-dosha profiles match the reference table in Section 5A."""
        # Vata: (3 / 3) * 100 = 100.00
        score_vata = calculate_dosha_score("vata", self.sample_task)
        self.assertEqual(score_vata, 100.00)

        # Pitta: (2 / 3) * 100 = 66.67
        score_pitta = calculate_dosha_score("pitta", self.sample_task)
        self.assertEqual(score_pitta, 66.67)

        # Kapha: (1 / 3) * 100 = 33.33
        score_kapha = calculate_dosha_score("kapha", self.sample_task)
        self.assertEqual(score_kapha, 33.33)

    def test_dual_dosha_scoring(self):
        """Test dual-dosha profiles match the reference table in Section 5A."""
        # Vata-Pitta: ((3 + 2) / 2) / 3 * 100 = 83.33
        score_vp = calculate_dosha_score("vata-pitta", self.sample_task)
        self.assertEqual(score_vp, 83.33)

        # Vata-Kapha: ((3 + 1) / 2) / 3 * 100 = 66.67
        score_vk = calculate_dosha_score("vata-kapha", self.sample_task)
        self.assertEqual(score_vk, 66.67)

        # Pitta-Kapha: ((2 + 1) / 2) / 3 * 100 = 50.00
        score_pk = calculate_dosha_score("pitta-kapha", self.sample_task)
        self.assertEqual(score_pk, 50.00)

    def test_triple_dosha_scoring(self):
        """Test triple-dosha profile matches the reference table in Section 5A."""
        # Vata-Pitta-Kapha: ((3 + 2 + 1) / 3) / 3 * 100 = 66.67
        score_vpk = calculate_dosha_score("vata-pitta-kapha", self.sample_task)
        self.assertEqual(score_vpk, 66.67)

    def test_case_and_order_insensitivity(self):
        """Test that casing and permuted dosha orders yield identical scores."""
        score_1 = calculate_dosha_score("Vata-Pitta", self.sample_task)
        score_2 = calculate_dosha_score("pitta-vata", self.sample_task)
        score_3 = calculate_dosha_score("PITTA_VATA", self.sample_task)
        self.assertEqual(score_1, 83.33)
        self.assertEqual(score_2, 83.33)
        self.assertEqual(score_3, 83.33)

        score_vpk_mixed = calculate_dosha_score("kapha-vata-pitta", self.sample_task)
        self.assertEqual(score_vpk_mixed, 66.67)

    def test_boundary_affinity_values(self):
        """Test boundary affinity values (all 1s and all 3s)."""
        min_task = {
            "task_id": "MIN01",
            "dosha_affinity": {"vata": 1, "pitta": 1, "kapha": 1},
        }
        max_task = {
            "task_id": "MAX01",
            "dosha_affinity": {"vata": 3, "pitta": 3, "kapha": 3},
        }

        # All 1s: (1 / 3) * 100 = 33.33
        self.assertEqual(calculate_dosha_score("vata", min_task), 33.33)
        self.assertEqual(calculate_dosha_score("vata-pitta", min_task), 33.33)
        self.assertEqual(calculate_dosha_score("vata-pitta-kapha", min_task), 33.33)

        # All 3s: (3 / 3) * 100 = 100.00
        self.assertEqual(calculate_dosha_score("vata", max_task), 100.00)
        self.assertEqual(calculate_dosha_score("vata-pitta", max_task), 100.00)
        self.assertEqual(calculate_dosha_score("vata-pitta-kapha", max_task), 100.00)

    def test_invalid_prakriti_raises(self):
        """Test that invalid or unsupported Prakriti strings raise ValueError."""
        with self.assertRaises(ValueError):
            calculate_dosha_score("unknown-dosha", self.sample_task)

        with self.assertRaises(ValueError):
            calculate_dosha_score("", self.sample_task)

        with self.assertRaises(ValueError):
            calculate_dosha_score(None, self.sample_task)

    def test_missing_affinity_raises(self):
        """Test that task missing required dosha affinities raises ValueError."""
        bad_task = {
            "task_id": "BAD01",
            "dosha_affinity": {"vata": 3},  # missing pitta and kapha
        }
        with self.assertRaises(ValueError):
            calculate_dosha_score("pitta", bad_task)


if __name__ == "__main__":
    unittest.main()

