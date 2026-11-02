"""
Model Pipeline Module for Dincharya Recommendation System (Phase 2).

Encapsulates feature transformation, data validation, model training, evaluation,
and serialization logic.
"""

import csv
import json
import math
from pathlib import Path
import platform
import sys
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union
import warnings

import joblib
import numpy as np
import sklearn
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from src.catalogue_loader import load_catalogue
from src.feature_engineering import calculate_derived_features
from src.preprocessing import SUPPORTED_PRAKRITI_PROFILES, normalize_prakriti, validate_user_schedule

CATEGORIES: Tuple[str, ...] = ("work_break", "after_work", "before_bed", "after_waking")
RAW_INPUT_FIELDS: Tuple[str, ...] = (
    "primary_dosha",
    "break_start",
    "break_end",
    "return_home_time",
    "sleep_time",
    "wake_time",
)
DERIVED_NUMERIC_FIELDS: Tuple[str, ...] = (
    "break_duration",
    "sleep_duration",
    "available_after_work",
)
TARGET_FIELDS: Tuple[str, ...] = tuple(f"label_{cat}" for cat in CATEGORIES)
ALL_REQUIRED_CSV_FIELDS: Tuple[str, ...] = RAW_INPUT_FIELDS + DERIVED_NUMERIC_FIELDS + TARGET_FIELDS

DEFAULT_DATA_PATH = PACKAGE_ROOT / "data" / "dincharya_synthetic_dataset.csv"
DEFAULT_OUTPUT_DIR = PACKAGE_ROOT / "models"


class DincharyaFeatureTransformer:
    """
    Transforms user schedule and Prakriti inputs into numerical feature arrays.

    Features generated:
    1. One-hot dosha indicators for the 7 canonical Prakriti profiles (7 features)
    2. Cyclic sine and cosine components for the 5 raw 24-hr schedule times (10 features)
    3. Numeric derived durations in minutes (3 features)

    Total features: 20 features.
    No target labels, row indices, or answers are included (strictly leakage-free).
    """

    def __init__(self, dosha_profiles: Optional[Sequence[str]] = None) -> None:
        self.dosha_profiles = list(dosha_profiles or SUPPORTED_PRAKRITI_PROFILES)
        self.feature_names_: List[str] = []
        self._build_feature_names()

    def _build_feature_names(self) -> None:
        names: List[str] = [f"dosha_{profile}" for profile in self.dosha_profiles]
        for time_field in ("break_start", "break_end", "return_home_time", "sleep_time", "wake_time"):
            names.append(f"{time_field}_sin")
            names.append(f"{time_field}_cos")
        names.extend(DERIVED_NUMERIC_FIELDS)
        self.feature_names_ = names

    def get_feature_names_out(self) -> List[str]:
        return list(self.feature_names_)

    @staticmethod
    def _time_to_cyclic(time_str: str) -> Tuple[float, float]:
        parts = time_str.strip().split(":")
        if len(parts) != 2:
            raise ValueError(f"Invalid time string '{time_str}'. Expected 'HH:MM'.")
        hours = int(parts[0])
        minutes = int(parts[1])
        if not (0 <= hours < 24 and 0 <= minutes < 60):
            raise ValueError(f"Time out of 24-hour range: {time_str}")
        total_minutes = hours * 60 + minutes
        angle = 2.0 * math.pi * (total_minutes / 1440.0)
        return float(math.sin(angle)), float(math.cos(angle))

    def transform_single(self, record: Dict[str, Any]) -> np.ndarray:
        """Transform a single input record or dictionary into a 1D float array."""
        features: List[float] = []

        # 1. Dosha one-hot
        raw_dosha = str(record.get("primary_dosha", "")).strip()
        norm_dosha = normalize_prakriti(raw_dosha)
        for profile in self.dosha_profiles:
            features.append(1.0 if norm_dosha == profile else 0.0)

        # 2. Cyclic time features (5 times * 2 = 10 features)
        for time_field in ("break_start", "break_end", "return_home_time", "sleep_time", "wake_time"):
            val = record.get(time_field)
            if not val:
                raise ValueError(f"Missing schedule time field '{time_field}'.")
            s_val, c_val = self._time_to_cyclic(str(val))
            features.extend([s_val, c_val])

        # 3. Derived numeric durations (3 features)
        missing_derived = [f for f in DERIVED_NUMERIC_FIELDS if f not in record or record[f] is None]
        if missing_derived:
            sched = {
                "break_start": str(record["break_start"]),
                "break_end": str(record["break_end"]),
                "return_home_time": str(record["return_home_time"]),
                "sleep_time": str(record["sleep_time"]),
                "wake_time": str(record["wake_time"]),
            }
            derived = calculate_derived_features(sched)
            for f in DERIVED_NUMERIC_FIELDS:
                features.append(float(derived[f]))
        else:
            for f in DERIVED_NUMERIC_FIELDS:
                features.append(float(record[f]))

        return np.array(features, dtype=np.float64)

    def transform(self, records: Sequence[Dict[str, Any]]) -> np.ndarray:
        """Transform a sequence of records into a 2D float array (n_samples, n_features)."""
        if not records:
            return np.empty((0, len(self.feature_names_)), dtype=np.float64)
        rows = [self.transform_single(r) for r in records]
        return np.vstack(rows)


def validate_dataset(
    data_source: Union[str, Path, Sequence[Dict[str, Any]]],
    catalogue: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Validate the synthetic training dataset for completeness, schema integrity, and label validity.

    Raises:
        FileNotFoundError: If the CSV file does not exist.
        ValueError: If required columns are missing, values are empty, task IDs are invalid,
                    or category labels mismatch the catalogue.
    """
    if catalogue is None:
        catalogue = load_catalogue()
    task_catalog_map = {t["task_id"]: t["category"] for t in catalogue.get("tasks", [])}

    if isinstance(data_source, (str, Path)):
        csv_path = Path(data_source)
        if not csv_path.exists():
            raise FileNotFoundError(
                f"Training dataset CSV not found at '{csv_path}'. "
                "Ensure the dataset has been generated first."
            )
        with csv_path.open(encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            if reader.fieldnames is None:
                raise ValueError(f"Dataset CSV at '{csv_path}' is completely empty or has no header.")
            fieldnames = list(reader.fieldnames)
            missing_fields = [f for f in ALL_REQUIRED_CSV_FIELDS if f not in fieldnames]
            if missing_fields:
                raise ValueError(
                    f"Dataset CSV at '{csv_path}' is missing required columns: {missing_fields}."
                )
            rows = list(reader)
    else:
        rows = list(data_source)
        if not rows:
            raise ValueError("Dataset records sequence is empty.")
        first_keys = set(rows[0].keys())
        missing_fields = [f for f in ALL_REQUIRED_CSV_FIELDS if f not in first_keys]
        if missing_fields:
            raise ValueError(f"Dataset records are missing required fields: {missing_fields}.")

    if not rows:
        raise ValueError("Dataset contains 0 rows of data.")

    seen_signatures = set()
    duplicate_count = 0
    doshas_found = set()

    for idx, row in enumerate(rows, start=1):
        # 1. Missing or empty values check
        for field in ALL_REQUIRED_CSV_FIELDS:
            val = row.get(field)
            if val is None or str(val).strip() == "":
                raise ValueError(
                    f"Row {idx} contains empty/missing value for required column '{field}'."
                )

        # 2. Dosha validation
        dosha = str(row["primary_dosha"]).strip()
        try:
            norm_dosha = normalize_prakriti(dosha)
            doshas_found.add(norm_dosha)
        except ValueError as exc:
            raise ValueError(f"Row {idx} has invalid primary_dosha '{dosha}': {exc}") from exc

        # 3. Schedule times validation
        schedule = {field: str(row[field]) for field in RAW_INPUT_FIELDS[1:]}
        try:
            validate_user_schedule(schedule)
        except ValueError as exc:
            raise ValueError(f"Row {idx} has invalid schedule times: {exc}") from exc

        # 4. Target label and category consistency check against catalogue
        for category in CATEGORIES:
            target_col = f"label_{category}"
            task_id = str(row[target_col]).strip()
            if task_id not in task_catalog_map:
                raise ValueError(
                    f"Row {idx} has unknown task_id '{task_id}' for column '{target_col}' "
                    "not found in task catalogue."
                )
            expected_cat = task_catalog_map[task_id]
            if expected_cat != category:
                raise ValueError(
                    f"Row {idx} label mismatch: task '{task_id}' belongs to category '{expected_cat}', "
                    f"but is assigned to target '{target_col}'."
                )

        # 5. Check duplicate row signatures
        sig = (norm_dosha, *(str(row[f]) for f in RAW_INPUT_FIELDS[1:]))
        if sig in seen_signatures:
            duplicate_count += 1
        seen_signatures.add(sig)

    missing_profiles = set(SUPPORTED_PRAKRITI_PROFILES) - doshas_found
    if missing_profiles:
        raise ValueError(
            f"Dataset does not cover all supported Prakriti profiles. Missing: {sorted(missing_profiles)}."
        )

    return rows


def perform_train_test_split(
    rows: List[Dict[str, Any]],
    test_size: float = 0.2,
    seed: int = 42,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], bool]:
    """
    Split rows into train and held-out test subsets using a deterministic seed.
    Attempts stratified split by primary_dosha where feasible; gracefully falls
    back if classes are too small.
    """
    if not (0.0 < test_size < 1.0):
        raise ValueError(f"test_size must be strictly between 0.0 and 1.0, got {test_size}.")
    if len(rows) < 2:
        raise ValueError(f"Dataset has {len(rows)} rows; at least 2 rows required for train/test split.")

    dosha_labels = [str(r["primary_dosha"]).strip().lower() for r in rows]
    dosha_counts = {}
    for d in dosha_labels:
        dosha_counts[d] = dosha_counts.get(d, 0) + 1

    min_count = min(dosha_counts.values()) if dosha_counts else 0
    can_stratify = min_count >= 2 and len(dosha_counts) > 1

    if can_stratify:
        try:
            train_idx, test_idx = train_test_split(
                range(len(rows)),
                test_size=test_size,
                random_state=seed,
                stratify=dosha_labels,
            )
            is_stratified = True
        except ValueError:
            train_idx, test_idx = train_test_split(
                range(len(rows)),
                test_size=test_size,
                random_state=seed,
                shuffle=True,
            )
            is_stratified = False
    else:
        train_idx, test_idx = train_test_split(
            range(len(rows)),
            test_size=test_size,
            random_state=seed,
            shuffle=True,
        )
        is_stratified = False

    train_rows = [rows[i] for i in train_idx]
    test_rows = [rows[i] for i in test_idx]
    return train_rows, test_rows, is_stratified


def train_models(
    train_rows: List[Dict[str, Any]],
    transformer: Optional[DincharyaFeatureTransformer] = None,
    seed: int = 42,
    n_estimators: int = 100,
    max_depth: Optional[int] = 12,
) -> Tuple[
    DincharyaFeatureTransformer,
    Dict[str, RandomForestClassifier],
    Dict[str, DummyClassifier],
]:
    """
    Train one Random Forest classifier and one DummyClassifier baseline per category.
    """
    if transformer is None:
        transformer = DincharyaFeatureTransformer()

    X_train = transformer.transform(train_rows)

    models: Dict[str, RandomForestClassifier] = {}
    baselines: Dict[str, DummyClassifier] = {}

    for category in CATEGORIES:
        target_col = f"label_{category}"
        y_train = np.array([str(r[target_col]).strip() for r in train_rows])

        rf = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=seed,
            n_jobs=1,
        )
        rf.fit(X_train, y_train)
        models[category] = rf

        dummy = DummyClassifier(strategy="most_frequent")
        dummy.fit(X_train, y_train)
        baselines[category] = dummy

    return transformer, models, baselines


def evaluate_models(
    transformer: DincharyaFeatureTransformer,
    models: Dict[str, RandomForestClassifier],
    baselines: Dict[str, DummyClassifier],
    train_rows: List[Dict[str, Any]],
    test_rows: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Evaluate trained models and baselines on held-out test set.
    Computes accuracy, macro-F1, weighted-F1, test size, class counts, and confusion matrices.
    """
    X_test = transformer.transform(test_rows)

    metrics_report: Dict[str, Any] = {
        "evaluation_notes": (
            "Metrics evaluate agreement with the synthetic heuristic label-generator. "
            "High scores reflect model fidelity to the rule-based suitability scoring engine, "
            "not real-world effectiveness or clinical efficacy."
        ),
        "train_set_size": len(train_rows),
        "test_set_size": len(test_rows),
        "categories": {},
    }

    for category in CATEGORIES:
        target_col = f"label_{category}"
        y_train = [str(r[target_col]).strip() for r in train_rows]
        y_test = [str(r[target_col]).strip() for r in test_rows]

        train_counts = {}
        for label in y_train:
            train_counts[label] = train_counts.get(label, 0) + 1

        test_counts = {}
        for label in y_test:
            test_counts[label] = test_counts.get(label, 0) + 1

        rf_model = models[category]
        rf_preds = rf_model.predict(X_test)

        acc = float(accuracy_score(y_test, rf_preds))
        macro_f1 = float(f1_score(y_test, rf_preds, average="macro", zero_division=0))
        weighted_f1 = float(f1_score(y_test, rf_preds, average="weighted", zero_division=0))

        dummy_model = baselines[category]
        dummy_preds = dummy_model.predict(X_test)
        dummy_acc = float(accuracy_score(y_test, dummy_preds))
        dummy_macro_f1 = float(f1_score(y_test, dummy_preds, average="macro", zero_division=0))
        dummy_weighted_f1 = float(f1_score(y_test, dummy_preds, average="weighted", zero_division=0))

        unique_labels = sorted(list(set(y_train) | set(y_test)))
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            cm = confusion_matrix(y_test, rf_preds, labels=unique_labels).tolist()

        metrics_report["categories"][category] = {
            "model_metrics": {
                "accuracy": round(acc, 4),
                "macro_f1": round(macro_f1, 4),
                "weighted_f1": round(weighted_f1, 4),
            },
            "baseline_metrics": {
                "strategy": "most_frequent",
                "accuracy": round(dummy_acc, 4),
                "macro_f1": round(dummy_macro_f1, 4),
                "weighted_f1": round(dummy_weighted_f1, 4),
            },
            "class_counts_train": train_counts,
            "class_counts_test": test_counts,
            "classes": unique_labels,
            "confusion_matrix": {
                "labels": unique_labels,
                "matrix": cm,
            },
            "num_classes_in_train": len(train_counts),
            "num_classes_in_test": len(test_counts),
        }

    return metrics_report


def save_model_artifacts(
    output_dir: Union[str, Path],
    transformer: DincharyaFeatureTransformer,
    models: Dict[str, RandomForestClassifier],
    baselines: Dict[str, DummyClassifier],
    metrics_report: Dict[str, Any],
    seed: int,
    test_size: float,
) -> Tuple[Path, Path]:
    """
    Save serialized model bundle and JSON metrics report to output_dir.
    """
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    bundle_path = out_dir / "dincharya_models.joblib"
    metrics_path = out_dir / "metrics.json"

    bundle = {
        "format_version": "1.0",
        "python_version": platform.python_version(),
        "sklearn_version": sklearn.__version__,
        "joblib_version": joblib.__version__,
        "numpy_version": np.__version__,
        "categories": list(CATEGORIES),
        "seed": seed,
        "test_size": test_size,
        "feature_transformer": transformer,
        "models": models,
        "baselines": baselines,
        "feature_names": transformer.get_feature_names_out(),
    }

    joblib.dump(bundle, bundle_path, compress=3)

    with metrics_path.open("w", encoding="utf-8") as f:
        json.dump(metrics_report, f, indent=2)

    return bundle_path, metrics_path


def load_model_bundle(bundle_path: Union[str, Path]) -> Dict[str, Any]:
    """
    Load a serialized model bundle from disk.
    """
    path = Path(bundle_path)
    if not path.exists():
        raise FileNotFoundError(f"Model bundle not found at: {path}")
    bundle = joblib.load(path)
    if not isinstance(bundle, dict) or "models" not in bundle:
        raise ValueError(f"File at '{path}' is not a valid Dincharya model bundle.")
    return bundle


def predict_tasks(bundle: Dict[str, Any], user_input: Dict[str, Any]) -> Dict[str, str]:
    """
    Predict one recommended task ID for each category from user schedule and dosha.
    """
    transformer: DincharyaFeatureTransformer = bundle["feature_transformer"]
    models: Dict[str, RandomForestClassifier] = bundle["models"]

    x_vec = transformer.transform_single(user_input).reshape(1, -1)
    predictions = {}
    for category in CATEGORIES:
        model = models[category]
        pred_label = model.predict(x_vec)[0]
        predictions[category] = str(pred_label)

    return predictions


def format_confusion_matrix_ascii(labels: List[str], matrix: List[List[int]]) -> str:
    """Format confusion matrix as a compact ASCII table."""
    col_w = max(6, max(len(l) for l in labels) + 2)
    header = f"{'True\\Pred':<{col_w}}" + "".join(f"{l:>{col_w}}" for l in labels)
    separator = "-" * len(header)
    lines = [header, separator]
    for idx, row in enumerate(matrix):
        row_str = f"{labels[idx]:<{col_w}}" + "".join(f"{val:>{col_w}}" for val in row)
        lines.append(row_str)
    return "\n    ".join(lines)


def train_pipeline(
    data_path: Union[str, Path] = DEFAULT_DATA_PATH,
    output_dir: Union[str, Path] = DEFAULT_OUTPUT_DIR,
    seed: int = 42,
    test_size: float = 0.2,
) -> Dict[str, Any]:
    """
    Complete reproducible training, evaluation, and artifact-saving pipeline.
    """
    validated_rows = validate_dataset(data_path)
    train_rows, test_rows, is_stratified = perform_train_test_split(
        validated_rows, test_size=test_size, seed=seed
    )
    transformer, models, baselines = train_models(train_rows, seed=seed)
    metrics_report = evaluate_models(transformer, models, baselines, train_rows, test_rows)
    metrics_report["meta"] = {
        "data_path": str(data_path),
        "seed": seed,
        "test_size": test_size,
        "is_stratified": is_stratified,
        "python_version": platform.python_version(),
        "sklearn_version": sklearn.__version__,
    }
    bundle_path, metrics_path = save_model_artifacts(
        output_dir=output_dir,
        transformer=transformer,
        models=models,
        baselines=baselines,
        metrics_report=metrics_report,
        seed=seed,
        test_size=test_size,
    )
    return {
        "bundle_path": bundle_path,
        "metrics_path": metrics_path,
        "metrics_report": metrics_report,
        "train_rows_count": len(train_rows),
        "test_rows_count": len(test_rows),
        "is_stratified": is_stratified,
    }

