/**
 * Dincharya Controller (Phase 4)
 * 
 * Handles authenticated requests for personalized Dincharya recommendations.
 * Retrieves canonical Prakriti from MongoDB and passes validated schedules to
 * the Python inference microservice.
 */

const User = require('../models/User');
const QuizAttempt = require('../models/QuizAttempt');
const dincharyaService = require('../services/dincharya.service');

const TIME_24H_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

const FORBIDDEN_CLIENT_FIELDS = [
  'primary_dosha',
  'primaryDosha',
  'dosha',
  'task_id',
  'label_work_break',
  'label_after_work',
  'label_before_bed',
  'label_after_waking',
];

const SUPPORTED_PRAKRITI_PROFILES = new Set([
  'vata',
  'pitta',
  'kapha',
  'vata-pitta',
  'vata-kapha',
  'pitta-kapha',
  'vata-pitta-kapha',
]);

/**
 * Normalizes Prakriti profile to canonical format (e.g. "Vata-Pitta" -> "vata-pitta").
 * Also handles permutation order (e.g. "pitta-vata" -> "vata-pitta").
 */
function normalizePrakriti(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const lower = raw.trim().toLowerCase();
  if (SUPPORTED_PRAKRITI_PROFILES.has(lower)) {
    return lower;
  }

  // Check reversed two-dosha permutation
  const parts = lower.split('-').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 2) {
    const reversed = `${parts[1]}-${parts[0]}`;
    if (SUPPORTED_PRAKRITI_PROFILES.has(reversed)) {
      return reversed;
    }
  }

  return null;
}

/**
 * Converts a valid HH:MM string to total minutes from midnight.
 */
function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Generates personalized Dincharya recommendations for the authenticated user.
 */
exports.getRecommendations = async (req, res, next) => {
  try {
    const body = req.body || {};

    // 1. Strictly forbid client-supplied dosha or task labels
    for (const field of FORBIDDEN_CLIENT_FIELDS) {
      if (body[field] !== undefined) {
        return res.status(400).json({
          ok: false,
          message: `Client-supplied '${field}' is not permitted. Dosha is retrieved from your saved profile.`,
        });
      }
    }

    // 2. Extract schedule fields (supporting snake_case or camelCase)
    const breakStart = body.break_start || body.breakStart;
    const breakEnd = body.break_end || body.breakEnd;
    const returnHomeTime = body.return_home_time || body.returnHomeTime;
    const sleepTime = body.sleep_time || body.sleepTime;
    const wakeTime = body.wake_time || body.wakeTime;

    const scheduleFields = {
      break_start: breakStart,
      break_end: breakEnd,
      return_home_time: returnHomeTime,
      sleep_time: sleepTime,
      wake_time: wakeTime,
    };

    for (const [key, val] of Object.entries(scheduleFields)) {
      if (!val || typeof val !== 'string') {
        return res.status(400).json({
          ok: false,
          message: `Missing required schedule field: '${key}'.`,
        });
      }

      if (!TIME_24H_REGEX.test(val.trim())) {
        return res.status(400).json({
          ok: false,
          message: `Invalid 24-hour time format for '${key}' ('${val}'). Expected 'HH:MM' (00:00 to 23:59).`,
        });
      }
    }

    // 3. Validate break ordering (work break cannot cross midnight; end > start)
    const breakStartMinutes = timeToMinutes(breakStart);
    const breakEndMinutes = timeToMinutes(breakEnd);

    if (breakEndMinutes <= breakStartMinutes) {
      return res.status(400).json({
        ok: false,
        message: 'Work break end time must be later than start time. Work breaks cannot cross midnight.',
      });
    }

    // 4. Retrieve authenticated user's Prakriti
    let rawDosha = req.user && req.user.primaryDosha;

    // Fall back to latest QuizAttempt if User.primaryDosha is not set
    if (!rawDosha && req.user && req.user._id) {
      try {
        const latestQuiz = await QuizAttempt.findOne({ userId: req.user._id })
          .sort({ createdAt: -1 })
          .exec();

        if (latestQuiz && latestQuiz.dominantType) {
          rawDosha = latestQuiz.dominantType;
        }
      } catch (dbErr) {
        // If DB query fails (e.g. disconnected in unit test), proceed to validation
      }
    }

    const normalizedDosha = normalizePrakriti(rawDosha);

    if (!normalizedDosha) {
      return res.status(400).json({
        ok: false,
        code: 'DOSHA_ASSESSMENT_REQUIRED',
        message: 'Please complete your Prakriti / Dosha assessment quiz before requesting Dincharya recommendations.',
      });
    }

    // 5. Call Python inference microservice
    const result = await dincharyaService.fetchRecommendations({
      primaryDosha: normalizedDosha,
      breakStart: breakStart.trim(),
      breakEnd: breakEnd.trim(),
      returnHomeTime: returnHomeTime.trim(),
      sleepTime: sleepTime.trim(),
      wakeTime: wakeTime.trim(),
    });

    return res.status(200).json({
      ok: true,
      recommendations: result.recommendations,
      model: result.model,
    });
  } catch (err) {
    next(err);
  }
};
