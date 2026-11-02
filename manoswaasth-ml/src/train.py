"""
CLI Entry Point for Dincharya ML Model Training.

Run from repository root:
    python manoswaasth-ml/src/train.py --data manoswaasth-ml/data/dincharya_synthetic_dataset.csv
"""

import argparse
from pathlib import Path
import sys
from typing import List, Optional

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from src.model_pipeline import (
    DEFAULT_DATA_PATH,
    DEFAULT_OUTPUT_DIR,
    format_confusion_matrix_ascii,
    train_pipeline,
)


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Train and evaluate Random Forest models for Dincharya task recommendation."
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=DEFAULT_DATA_PATH,
        help=f"Path to input CSV dataset (default: {DEFAULT_DATA_PATH})",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Directory to save trained models and metrics (default: {DEFAULT_OUTPUT_DIR})",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Deterministic random seed (default: 42)",
    )
    parser.add_argument(
        "--test-size",
        type=float,
        default=0.2,
        help="Fraction of dataset held out for evaluation (default: 0.2)",
    )

    args = parser.parse_args(argv)

    if not (0.0 < args.test_size < 1.0):
        sys.stderr.write(f"Error: --test-size must be strictly between 0.0 and 1.0, got {args.test_size}\n")
        return 1

    try:
        print("=" * 80)
        print("MANOSWAASTH DINCHARYA ML TRAINING PIPELINE (PHASE 2)")
        print("=" * 80)
        print(f"Dataset path : {args.data}")
        print(f"Output dir   : {args.output_dir}")
        print(f"Random seed  : {args.seed}")
        print(f"Test size    : {args.test_size} ({int(args.test_size * 100)}% held-out)")
        print("-" * 80)

        result = train_pipeline(
            data_path=args.data,
            output_dir=args.output_dir,
            seed=args.seed,
            test_size=args.test_size,
        )

        metrics = result["metrics_report"]
        strat_str = "Stratified by primary_dosha" if result["is_stratified"] else "Standard split"
        print(f"[OK] Training complete ({strat_str}):")
        print(f"     Train samples: {result['train_rows_count']}")
        print(f"     Test samples : {result['test_rows_count']}")
        print("-" * 80)
        print(f"{'Category':<15} {'RF Acc':<9} {'RF Macro-F1':<13} {'RF Wtd-F1':<11} {'Dummy Acc':<11} {'Classes (Test)'}")
        print("-" * 80)

        for cat, data in metrics["categories"].items():
            rf_m = data["model_metrics"]
            dm_m = data["baseline_metrics"]
            classes_str = ", ".join(f"{k}:{v}" for k, v in data["class_counts_test"].items())
            print(
                f"{cat:<15} {rf_m['accuracy']:<9.4f} {rf_m['macro_f1']:<13.4f} "
                f"{rf_m['weighted_f1']:<11.4f} {dm_m['accuracy']:<11.4f} {classes_str}"
            )

        print("-" * 80)
        print("Confusion Matrices (Held-Out Test Set):")
        for cat, data in metrics["categories"].items():
            cm_data = data["confusion_matrix"]
            print(f"\n  [{cat.upper()}]")
            print("    " + format_confusion_matrix_ascii(cm_data["labels"], cm_data["matrix"]))

        print("\n" + "=" * 80)
        print("Artifacts saved:")
        print(f"  Model bundle : {result['bundle_path']}")
        print(f"  Metrics JSON : {result['metrics_path']}")
        print("=" * 80)

    except Exception as exc:
        sys.stderr.write(f"Training failed with error: {exc}\n")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
