/**
 * Dincharya Recommendation Service (Phase 4)
 * 
 * Communicates with the Python FastAPI inference microservice to obtain
 * personalised daily Ayurvedic ritual recommendations based on primary Prakriti
 * and daily schedule.
 */

const DINCHARYA_SERVICE_URL = (
  process.env.DINCHARYA_SERVICE_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '');

const DINCHARYA_TIMEOUT_MS = parseInt(process.env.DINCHARYA_TIMEOUT_MS, 10) || 5000;

const EXPECTED_CATEGORIES = ['work_break', 'after_work', 'before_bed', 'after_waking'];

/**
 * Validates the Python response schema and task structure.
 * 
 * @param {object} data - Parsed JSON response from the Python service
 * @returns {object} Validated response object
 */
function validatePythonResponse(data) {
  if (!data || typeof data !== 'object') {
    const error = new Error('Invalid response structure received from recommendation service.');
    error.statusCode = 502;
    throw error;
  }

  const { recommendations, model } = data;
  if (!recommendations || typeof recommendations !== 'object') {
    const error = new Error('Recommendation service response is missing recommendations.');
    error.statusCode = 502;
    throw error;
  }

  for (const category of EXPECTED_CATEGORIES) {
    const task = recommendations[category];
    if (!task || typeof task !== 'object') {
      const error = new Error(`Recommendation service response missing category '${category}'.`);
      error.statusCode = 502;
      throw error;
    }

    if (!task.task_id || typeof task.task_id !== 'string') {
      const error = new Error(`Invalid or missing task_id for category '${category}'.`);
      error.statusCode = 502;
      throw error;
    }

    if (!task.title || typeof task.title !== 'string') {
      const error = new Error(`Invalid or missing title for category '${category}'.`);
      error.statusCode = 502;
      throw error;
    }

    if (typeof task.duration_minutes !== 'number' || task.duration_minutes <= 0) {
      const error = new Error(`Invalid duration_minutes for category '${category}'.`);
      error.statusCode = 502;
      throw error;
    }

    if (!Array.isArray(task.safety_restrictions)) {
      task.safety_restrictions = [];
    }

    task.ayurvedic_principle = typeof task.ayurvedic_principle === 'string' ? task.ayurvedic_principle : '';
    task.description = typeof task.description === 'string' ? task.description : '';
  }

  return { recommendations, model };
}

/**
 * Calls the Python inference API to generate recommendations.
 * 
 * @param {object} params
 * @param {string} params.primaryDosha - Normalized primary Prakriti
 * @param {string} params.breakStart - HH:MM
 * @param {string} params.breakEnd - HH:MM
 * @param {string} params.returnHomeTime - HH:MM
 * @param {string} params.sleepTime - HH:MM
 * @param {string} params.wakeTime - HH:MM
 * @returns {Promise<object>} Enriched recommendations and model info
 */
async function fetchRecommendations({
  primaryDosha,
  breakStart,
  breakEnd,
  returnHomeTime,
  sleepTime,
  wakeTime,
}) {
  const url = `${DINCHARYA_SERVICE_URL}/recommend`;

  const payload = {
    primary_dosha: primaryDosha,
    break_start: breakStart,
    break_end: breakEnd,
    return_home_time: returnHomeTime,
    sleep_time: sleepTime,
    wake_time: wakeTime,
  };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(DINCHARYA_TIMEOUT_MS),
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      const error = new Error(
        'The recommendation service timed out. Please try again later.'
      );
      error.statusCode = 503;
      throw error;
    }

    const error = new Error(
      'The recommendation service is currently unavailable. Please try again later.'
    );
    error.statusCode = 503;
    throw error;
  }

  if (!response.ok) {
    let errorDetail = 'Recommendation service request failed.';
    try {
      const errJson = await response.json();
      if (errJson && errJson.error) {
        errorDetail = errJson.error;
      }
    } catch (_) {
      // Ignore JSON parse error on non-ok responses
    }

    const error = new Error(errorDetail);
    error.statusCode = response.status === 422 ? 400 : 502;
    throw error;
  }

  let data;
  try {
    data = await response.json();
  } catch (_) {
    const error = new Error('Malformed JSON received from recommendation service.');
    error.statusCode = 502;
    throw error;
  }

  return validatePythonResponse(data);
}

module.exports = {
  fetchRecommendations,
  validatePythonResponse,
  EXPECTED_CATEGORIES,
};

