"""
Unit tests for the Dincharya Inference Service logic (Phase 3).

Testing strategy
----------------
The sandbox environment on Windows does not support an asyncio event loop
(``asyncio.run()`` and starlette ``TestClient`` both hang indefinitely).
All tests therefore operate at the **function / schema level** and never
touch the HTTP or ASGI layer:

* ``generate_recommendations()`` — end-to-end inference path.
* ``DincharyaRecommendationRequest`` Pydantic schema — field validation.
* ``ServiceState`` loading and compatibility.

This coverage is sufficient because:
  - Every ``/recommend`` route delegates entirely to ``generate_recommendations()``.
  - Every ``/health`` route reads from ``ServiceState`` attributes.
  - FastAPI/Pydantic handle field-level validation before our code runs.
  - Custom exception handlers convert our raised ``HTTPException``s into JSON.

Run the service manually and probe with curl to confirm HTTP wire-level
behaviour (see WALKTHROUGH.md §9 for instructions).
"""

from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from pydantic import ValidationError

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from src.api import (
    DEFAULT_CATALOGUE_PATH,
    DEFAULT_MODEL_PATH,
    DincharyaRecommendationRequest,
    ServiceState,
    generate_recommendations,
)
from src.catalogue_loader import load_catalogue
from src.model_pipeline import CATEGORIES


# ---------------------------------------------------------------------------
# Module-level shared state: loaded once for all tests.
# ---------------------------------------------------------------------------

_SHARED_STATE: ServiceState = ServiceState(
    model_path=DEFAULT_MODEL_PATH,
    catalogue_path=DEFAULT_CATALOGUE_PATH,
)
_SHARED_STATE.load_artifacts()


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _make_request(**overrides) -> DincharyaRecommendationRequest:
    """Return a valid request, optionally overriding individual fields."""
    defaults = dict(
        primary_dosha="vata-pitta",
        break_start="13:00",
        break_end="13:10",
        return_home_time="18:30",
        sleep_time="23:00",
        wake_time="06:30",
    )
    defaults.update(overrides)
    return DincharyaRecommendationRequest(**defaults)


# ---------------------------------------------------------------------------
# 1. Pydantic schema validation
# ---------------------------------------------------------------------------

class TestRequestSchemaValidation(unittest.TestCase):
    """DincharyaRecommendationRequest field-level validation."""

    def test_valid_request_accepted(self):
        """A fully valid payload creates a request without error."""
        req = _make_request()
        self.assertEqual(req.primary_dosha, "vata-pitta")

    def test_invalid_hour_rejected(self):
        """Hour > 23 in any time field raises a ValidationError."""
        with self.assertRaises(ValidationError):
            _make_request(break_start="25:00")

    def test_invalid_minute_rejected(self):
        """Minute > 59 in any time field raises a ValidationError."""
        with self.assertRaises(ValidationError):
            _make_request(sleep_time="22:60")

    def test_extra_field_rejected(self):
        """Extra fields (e.g. label injection) raise ValidationError due to extra='forbid'."""
        with self.assertRaises(ValidationError):
            DincharyaRecommendationRequest(
                primary_dosha="vata",
                break_start="13:00",
                break_end="13:10",
                return_home_time="18:30",
                sleep_time="23:00",
                wake_time="06:30",
                label_work_break="BR01",   # forbidden extra field
            )

    def test_missing_required_field_rejected(self):
        """Omitting a required field raises ValidationError."""
        with self.assertRaises(ValidationError):
            DincharyaRecommendationRequest(
                primary_dosha="vata",
                break_start="13:00",
                break_end="13:10",
                return_home_time="18:30",
                sleep_time="23:00",
                # wake_time omitted
            )

    def test_midnight_crossing_bedtime_accepted(self):
        """A bedtime after midnight ('01:00') is a valid HH:MM string."""
        req = _make_request(sleep_time="01:00", wake_time="08:00")
        self.assertEqual(req.sleep_time, "01:00")

    def test_single_dosha_names_accepted(self):
        """Single-dosha names ('vata', 'pitta', 'kapha') are accepted by the schema."""
        for dosha in ("vata", "pitta", "kapha"):
            with self.subTest(dosha=dosha):
                req = _make_request(primary_dosha=dosha)
                self.assertEqual(req.primary_dosha, dosha)


# ---------------------------------------------------------------------------
# 2. generate_recommendations() — success paths
# ---------------------------------------------------------------------------

class TestGenerateRecommendationsSuccess(unittest.TestCase):
    """generate_recommendations() with a fully loaded shared state."""

    def test_returns_all_four_categories(self):
        """Output contains recommendations for all four Dincharya categories."""
        req = _make_request()
        result = generate_recommendations(_SHARED_STATE, req)
        self.assertEqual(set(result.recommendations.keys()), set(CATEGORIES))

    def test_each_task_has_required_fields(self):
        """Every returned TaskRecommendation carries the required metadata fields."""
        req = _make_request()
        result = generate_recommendations(_SHARED_STATE, req)
        for cat in CATEGORIES:
            with self.subTest(category=cat):
                task = result.recommendations[cat]
                self.assertTrue(task.task_id)
                self.assertTrue(task.title)
                self.assertIsInstance(task.duration_minutes, int)
                self.assertGreater(task.duration_minutes, 0)

    def test_returned_tasks_belong_to_correct_catalogue_category(self):
        """Predicted tasks exist in the catalogue and belong to their expected category."""
        catalogue = load_catalogue(str(DEFAULT_CATALOGUE_PATH))
        task_map = {t["task_id"]: t for t in catalogue["tasks"]}
        req = _make_request()
        result = generate_recommendations(_SHARED_STATE, req)
        for cat in CATEGORIES:
            with self.subTest(category=cat):
                task_id = result.recommendations[cat].task_id
                self.assertIn(task_id, task_map,
                              f"Unknown task_id '{task_id}' for category '{cat}'")
                self.assertEqual(task_map[task_id]["category"], cat,
                                 f"Task '{task_id}' in wrong category for '{cat}'")

    def test_model_info_block_present(self):
        """Response includes a non-empty model info block."""
        req = _make_request()
        result = generate_recommendations(_SHARED_STATE, req)
        self.assertTrue(result.model.name)
        self.assertTrue(result.model.version)
        self.assertIn("non-medical", result.model.note)

    def test_dosha_case_insensitive(self):
        """'Vata-Pitta' and 'vata-pitta' produce identical recommendations."""
        r1 = generate_recommendations(_SHARED_STATE, _make_request(primary_dosha="Vata-Pitta"))
        r2 = generate_recommendations(_SHARED_STATE, _make_request(primary_dosha="vata-pitta"))
        for cat in CATEGORIES:
            self.assertEqual(
                r1.recommendations[cat].task_id,
                r2.recommendations[cat].task_id,
            )

    def test_dosha_order_normalization(self):
        """'pitta-vata' and 'vata-pitta' map to the same profile."""
        r1 = generate_recommendations(_SHARED_STATE, _make_request(primary_dosha="vata-pitta"))
        r2 = generate_recommendations(_SHARED_STATE, _make_request(primary_dosha="pitta-vata"))
        for cat in CATEGORIES:
            self.assertEqual(
                r1.recommendations[cat].task_id,
                r2.recommendations[cat].task_id,
            )

    def test_all_seven_prakriti_profiles_succeed(self):
        """All seven supported Prakriti profiles produce valid recommendations."""
        profiles = [
            "vata", "pitta", "kapha",
            "vata-pitta", "vata-kapha", "pitta-kapha",
            "vata-pitta-kapha",
        ]
        for dosha in profiles:
            with self.subTest(dosha=dosha):
                req = _make_request(primary_dosha=dosha)
                result = generate_recommendations(_SHARED_STATE, req)
                self.assertEqual(len(result.recommendations), 4)

    def test_midnight_crossing_sleep_succeeds(self):
        """Late bedtime that crosses midnight is handled without error."""
        req = _make_request(
            primary_dosha="vata-pitta-kapha",
            return_home_time="22:30",
            sleep_time="01:00",
            wake_time="08:00",
        )
        result = generate_recommendations(_SHARED_STATE, req)
        self.assertEqual(len(result.recommendations), 4)

    def test_deterministic_output_for_same_input(self):
        """Same input always produces the same recommendations (model is deterministic)."""
        req = _make_request()
        r1 = generate_recommendations(_SHARED_STATE, req)
        r2 = generate_recommendations(_SHARED_STATE, req)
        for cat in CATEGORIES:
            self.assertEqual(
                r1.recommendations[cat].task_id,
                r2.recommendations[cat].task_id,
            )


# ---------------------------------------------------------------------------
# 3. generate_recommendations() — error paths
# ---------------------------------------------------------------------------

class TestGenerateRecommendationsErrors(unittest.TestCase):
    """generate_recommendations() raises the correct exceptions for bad input."""

    def test_invalid_dosha_raises_422(self):
        """Unsupported Prakriti raises HTTPException with status 422."""
        req = _make_request(primary_dosha="invalid-dosha")
        with self.assertRaises(HTTPException) as ctx:
            generate_recommendations(_SHARED_STATE, req)
        self.assertEqual(ctx.exception.status_code, 422)
        self.assertIn("primary_dosha", ctx.exception.detail)

    def test_break_end_before_start_raises_422(self):
        """Break end earlier than start raises HTTPException with status 422."""
        req = _make_request(break_start="13:30", break_end="13:00")
        with self.assertRaises(HTTPException) as ctx:
            generate_recommendations(_SHARED_STATE, req)
        self.assertEqual(ctx.exception.status_code, 422)
        self.assertIn("earlier than start time", ctx.exception.detail)

    def test_break_end_equal_to_start_raises_422(self):
        """Zero-duration break (start == end) raises HTTPException with status 422."""
        req = _make_request(break_start="13:00", break_end="13:00")
        with self.assertRaises(HTTPException) as ctx:
            generate_recommendations(_SHARED_STATE, req)
        self.assertEqual(ctx.exception.status_code, 422)
        self.assertIn("identical", ctx.exception.detail)

    def test_unknown_task_id_from_model_raises_500(self):
        """Model predicting an unknown task_id results in HTTPException with status 500."""
        bad_preds = {
            "work_break": "UNKNOWN_99",
            "after_work": "HM01",
            "before_bed": "SL01",
            "after_waking": "WK01",
        }
        req = _make_request()
        with patch("src.api.predict_tasks", return_value=bad_preds):
            with self.assertRaises(HTTPException) as ctx:
                generate_recommendations(_SHARED_STATE, req)
        self.assertEqual(ctx.exception.status_code, 500)
        self.assertIn("unrecognized task identifier", ctx.exception.detail)

    def test_uninitialised_state_raises_runtime_error(self):
        """Calling generate_recommendations with an uninitialised state raises RuntimeError."""
        empty_state = ServiceState()
        req = _make_request()
        with self.assertRaises(RuntimeError):
            generate_recommendations(empty_state, req)


# ---------------------------------------------------------------------------
# 4. ServiceState
# ---------------------------------------------------------------------------

class TestServiceState(unittest.TestCase):
    """ServiceState loading and compatibility."""

    def test_shared_state_loaded_35_tasks(self):
        """The shared pre-loaded state indexes exactly 35 tasks from the catalogue."""
        self.assertEqual(len(_SHARED_STATE.tasks_by_id), 35)

    def test_shared_state_bundle_is_not_none(self):
        """The shared pre-loaded state has a valid model bundle."""
        self.assertIsNotNone(_SHARED_STATE.bundle)

    def test_all_four_model_categories_present(self):
        """Model bundle contains a trained model for each of the 4 Dincharya categories."""
        self.assertIn("models", _SHARED_STATE.bundle)
        for cat in CATEGORIES:
            self.assertIn(cat, _SHARED_STATE.bundle["models"],
                          f"Missing model for category '{cat}'")

    def test_all_catalogue_tasks_indexed(self):
        """tasks_by_id index covers every task in the catalogue file."""
        catalogue = load_catalogue(str(DEFAULT_CATALOGUE_PATH))
        expected_ids = {t["task_id"] for t in catalogue["tasks"]}
        self.assertEqual(set(_SHARED_STATE.tasks_by_id.keys()), expected_ids)

    def test_missing_model_raises_file_not_found(self):
        """load_artifacts() raises FileNotFoundError for a non-existent model path."""
        state = ServiceState(
            model_path=Path("non_existent_model.joblib"),
            catalogue_path=DEFAULT_CATALOGUE_PATH,
        )
        with self.assertRaises(FileNotFoundError):
            state.load_artifacts()

    def test_python_version_major_mismatch_raises_runtime_error(self):
        """Compatibility check raises RuntimeError on Python major version mismatch."""
        bad_bundle = {"python_version": "2.7.18", "sklearn_version": "1.9.1"}
        with self.assertRaises(RuntimeError):
            ServiceState._check_compatibility(bad_bundle)

    def test_sklearn_minor_mismatch_only_warns(self):
        """Minor sklearn version difference logs a warning but does not raise."""
        import logging
        bundle = {"python_version": "3.13.5", "sklearn_version": "1.0.0"}
        with self.assertLogs("dincharya_api", level=logging.WARNING) as log_ctx:
            ServiceState._check_compatibility(bundle)
        self.assertTrue(any("scikit-learn" in msg for msg in log_ctx.output))


if __name__ == "__main__":
    unittest.main()