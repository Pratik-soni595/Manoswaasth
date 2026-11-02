"""
Unit and integration tests for Model Pipeline and Training CLI (Phase 2).
"""

import copy
import csv
import json
import math
from pathlib import Path
import sys
import tempfile
import unittest

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from src.catalogue_loader import load_catalogue
from src.model_pipeline import (
    ALL_REQUIRED_CSV_FIELDS,
    CATEGORIES,
    DincharyaFeatureTransformer,
    evaluate_models,
    load_model_bundle,
    perform_train_test_split,
    predict_tasks,
    save_model_artifacts,
    train_models,
    validate_dataset,
)
from src.preprocessing import SUPPORTED_PRAKRITI_PROFILES
from src.train import main as train_cli_main


def _create_minimal_valid_dataset(repeats_per_dosha: int = 3) -> list:
    """Create a small in-memory dataset covering all 7 Prakriti profiles."""
    rows = []
    # Sample valid task IDs matching each category from catalogue
    category_labels = {
        "label_work_break": "BR01",
        "label_after_work": "HM01",
        "label_before_bed": "SL02",
        "label_after_waking": "WK03",
    }
    for profile in SUPPORTED_PRAKRITI_PROFILES:
        for idx in range(repeats_per_dosha):
            rows.append({
                "primary_dosha": profile,
                "break_start": f"{12 + idx:02d}:00",
                "break_end": f"{12 + idx:02d}:15",
                "return_home_time": "18:00",
                "sleep_time": "23:00",
                "wake_time": "07:00",
                "break_duration": 15,
                "sleep_duration": 480,
                "available_after_work": 300,
                **category_labels,
            })
    return rows


class TestModelPipeline(unittest.TestCase):
    def setUp(self):
        self.catalogue = load_catalogue()
        self.valid_rows = _create_minimal_valid_dataset(repeats_per_dosha=3)

    def test_validation_accepts_valid_dataset(self):
        validated = validate_dataset(self.valid_rows, catalogue=self.catalogue)
        self.assertEqual(len(validated), len(self.valid_rows))

    def test_validation_catches_missing_columns(self):
        bad_rows = [copy.deepcopy(r) for r in self.valid_rows]
        for r in bad_rows:
            del r["label_work_break"]
        with self.assertRaisesRegex(ValueError, "missing required fields"):
            validate_dataset(bad_rows, catalogue=self.catalogue)

    def test_validation_catches_missing_or_empty_values(self):
        bad_rows = [copy.deepcopy(r) for r in self.valid_rows]
        bad_rows[2]["break_start"] = ""  # empty string
        with self.assertRaisesRegex(ValueError, "contains empty/missing value"):
            validate_dataset(bad_rows, catalogue=self.catalogue)

        bad_rows_none = [copy.deepcopy(r) for r in self.valid_rows]
        bad_rows_none[1]["primary_dosha"] = None
        with self.assertRaisesRegex(ValueError, "contains empty/missing value"):
            validate_dataset(bad_rows_none, catalogue=self.catalogue)

    def test_validation_catches_invalid_task_id(self):
        bad_rows = [copy.deepcopy(r) for r in self.valid_rows]
        bad_rows[0]["label_work_break"] = "INVALID_TASK_99"
        with self.assertRaisesRegex(ValueError, "unknown task_id 'INVALID_TASK_99'"):
            validate_dataset(bad_rows, catalogue=self.catalogue)

    def test_validation_catches_mismatched_target_category(self):
        bad_rows = [copy.deepcopy(r) for r in self.valid_rows]
        # HM01 belongs to after_work, not work_break
        bad_rows[0]["label_work_break"] = "HM01"
        with self.assertRaisesRegex(ValueError, "label mismatch"):
            validate_dataset(bad_rows, catalogue=self.catalogue)

    def test_validation_catches_missing_dosha_profiles(self):
        # Exclude 'kapha'
        filtered_rows = [r for r in self.valid_rows if r["primary_dosha"] != "kapha"]
        with self.assertRaisesRegex(ValueError, "does not cover all supported Prakriti profiles"):
            validate_dataset(filtered_rows, catalogue=self.catalogue)

    def test_feature_transformer_dimensions_and_no_leakage(self):
        transformer = DincharyaFeatureTransformer()
        feature_names = transformer.get_feature_names_out()

        # 7 doshas + 10 cyclic times + 3 durations = 20 features
        self.assertEqual(len(feature_names), 20)

        # Strictly verify NO target column names or task IDs in input features
        for feat in feature_names:
            self.assertFalse(feat.startswith("label_"))
            self.assertNotIn("task_id", feat)
            self.assertNotIn("target", feat)

        # Verify cyclic values at known clock angles
        # 00:00 -> angle 0 -> sin=0.0, cos=1.0
        s_00, c_00 = transformer._time_to_cyclic("00:00")
        self.assertAlmostEqual(s_00, 0.0, places=5)
        self.assertAlmostEqual(c_00, 1.0, places=5)

        # 06:00 -> angle pi/2 -> sin=1.0, cos=0.0
        s_06, c_06 = transformer._time_to_cyclic("06:00")
        self.assertAlmostEqual(s_06, 1.0, places=5)
        self.assertAlmostEqual(c_06, 0.0, places=5)

        # 12:00 -> angle pi -> sin=0.0, cos=-1.0
        s_12, c_12 = transformer._time_to_cyclic("12:00")
        self.assertAlmostEqual(s_12, 0.0, places=5)
        self.assertAlmostEqual(c_12, -1.0, places=5)

    def test_feature_transformer_dosha_invariance(self):
        transformer = DincharyaFeatureTransformer()
        rec_standard = copy.deepcopy(self.valid_rows[0])
        rec_standard["primary_dosha"] = "vata-pitta"

        rec_permuted = copy.deepcopy(self.valid_rows[0])
        rec_permuted["primary_dosha"] = "Pitta-Vata"  # permuted order and capitalized

        vec1 = transformer.transform_single(rec_standard)
        vec2 = transformer.transform_single(rec_permuted)
        self.assertTrue((vec1 == vec2).all())

    def test_training_determinism_with_fixed_seed(self):
        train_rows, test_rows, _ = perform_train_test_split(self.valid_rows, test_size=0.3, seed=42)

        # Train run 1
        tf1, models1, base1 = train_models(train_rows, seed=99)
        metrics1 = evaluate_models(tf1, models1, base1, train_rows, test_rows)

        # Train run 2
        tf2, models2, base2 = train_models(train_rows, seed=99)
        metrics2 = evaluate_models(tf2, models2, base2, train_rows, test_rows)

        # Metrics must match exactly
        self.assertEqual(
            metrics1["categories"]["work_break"]["model_metrics"],
            metrics2["categories"]["work_break"]["model_metrics"],
        )

    def test_evaluation_reports_required_metrics_and_baseline(self):
        train_rows, test_rows, _ = perform_train_test_split(self.valid_rows, test_size=0.3, seed=42)
        transformer, models, baselines = train_models(train_rows, seed=42)
        report = evaluate_models(transformer, models, baselines, train_rows, test_rows)

        self.assertIn("train_set_size", report)
        self.assertIn("test_set_size", report)
        self.assertIn("evaluation_notes", report)

        for cat in CATEGORIES:
            cat_data = report["categories"][cat]
            self.assertIn("accuracy", cat_data["model_metrics"])
            self.assertIn("macro_f1", cat_data["model_metrics"])
            self.assertIn("weighted_f1", cat_data["model_metrics"])
            self.assertIn("accuracy", cat_data["baseline_metrics"])
            self.assertIn("class_counts_train", cat_data)
            self.assertIn("class_counts_test", cat_data)
            self.assertIn("confusion_matrix", cat_data)
            self.assertEqual(cat_data["baseline_metrics"]["strategy"], "most_frequent")

    def test_end_to_end_save_load_and_predict(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            train_rows, test_rows, _ = perform_train_test_split(self.valid_rows, test_size=0.3, seed=42)
            transformer, models, baselines = train_models(train_rows, seed=42)
            report = evaluate_models(transformer, models, baselines, train_rows, test_rows)

            bundle_path, metrics_path = save_model_artifacts(
                output_dir=tmp_dir,
                transformer=transformer,
                models=models,
                baselines=baselines,
                metrics_report=report,
                seed=42,
                test_size=0.3,
            )

            self.assertTrue(bundle_path.exists())
            self.assertTrue(metrics_path.exists())

            # Reload bundle
            loaded_bundle = load_model_bundle(bundle_path)
            self.assertIn("models", loaded_bundle)
            self.assertIn("feature_transformer", loaded_bundle)

            # Test inference prediction
            sample_input = {
                "primary_dosha": "vata-pitta",
                "break_start": "13:00",
                "break_end": "13:15",
                "return_home_time": "18:30",
                "sleep_time": "23:00",
                "wake_time": "06:30",
            }
            preds = predict_tasks(loaded_bundle, sample_input)
            self.assertEqual(set(preds.keys()), set(CATEGORIES))
            for cat, task_id in preds.items():
                self.assertIsInstance(task_id, str)
                self.assertTrue(len(task_id) > 0)

    def test_cli_execution_with_temporary_dataset(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            csv_file = tmp_path / "dataset.csv"
            out_models = tmp_path / "models"

            # Write temporary dataset
            with csv_file.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=ALL_REQUIRED_CSV_FIELDS)
                writer.writeheader()
                writer.writerows(self.valid_rows)

            # Test invalid test-size fails with code 1
            ret_bad = train_cli_main([
                "--data", str(csv_file),
                "--output-dir", str(out_models),
                "--test-size", "1.5",
            ])
            self.assertEqual(ret_bad, 1)

            # Test valid run succeeds with code 0
            ret_ok = train_cli_main([
                "--data", str(csv_file),
                "--output-dir", str(out_models),
                "--seed", "123",
                "--test-size", "0.25",
            ])
            self.assertEqual(ret_ok, 0)
            self.assertTrue((out_models / "dincharya_models.joblib").exists())
            self.assertTrue((out_models / "metrics.json").exists())


if __name__ == "__main__":
    unittest.main()

