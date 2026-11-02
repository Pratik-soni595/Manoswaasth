const test = require('node:test');
const assert = require('node:assert/strict');

const dincharyaService = require('../src/services/dincharya.service');
const dincharyaController = require('../src/controllers/dincharya.controller');

// Sample valid recommendation payload from Python microservice
const mockPythonValidResponse = {
  recommendations: {
    work_break: {
      task_id: 'BR01',
      title: 'Mindful Breathing & Pranayama',
      description: 'Slow Nadi Shodhana breathing.',
      duration_minutes: 5,
      safety_restrictions: [],
      ayurvedic_principle: 'Calms Prana Vata.',
    },
    after_work: {
      task_id: 'HM04',
      title: 'Herbal Evening Transition Tea',
      description: 'Warm herbal infusion.',
      duration_minutes: 10,
      safety_restrictions: [],
      ayurvedic_principle: 'Grounds active Rajas.',
    },
    before_bed: {
      task_id: 'SL02',
      title: 'Pada Abhyanga (Warm Foot Massage)',
      description: 'Warm sesame oil foot massage.',
      duration_minutes: 15,
      safety_restrictions: ['Avoid during fever.'],
      ayurvedic_principle: 'Pacifies Apana Vata.',
    },
    after_waking: {
      task_id: 'WK04',
      title: 'Warm Lemon & Honey Water',
      description: 'Warm water to stimulate peristalsis.',
      duration_minutes: 5,
      safety_restrictions: ['Never add honey to boiling water.'],
      ayurvedic_principle: 'Kindles Jatharagni.',
    },
  },
  model: {
    name: 'RandomForestClassifier',
    version: '1.0',
    scikit_learn_version: '1.9.1',
    note: 'Non-medical wellness recommendations.',
  },
};

test('1. dincharyaService.validatePythonResponse accepts valid structure', () => {
  const result = dincharyaService.validatePythonResponse(mockPythonValidResponse);
  assert.equal(typeof result.recommendations, 'object');
  assert.equal(result.recommendations.work_break.task_id, 'BR01');
  assert.equal(result.recommendations.after_work.task_id, 'HM04');
  assert.equal(result.recommendations.before_bed.task_id, 'SL02');
  assert.equal(result.recommendations.after_waking.task_id, 'WK04');
});

test('2. dincharyaService.validatePythonResponse rejects missing category', () => {
  const corrupted = JSON.parse(JSON.stringify(mockPythonValidResponse));
  delete corrupted.recommendations.after_waking;

  assert.throws(
    () => dincharyaService.validatePythonResponse(corrupted),
    (err) => err.statusCode === 502 && err.message.includes('after_waking')
  );
});

test('3. dincharyaService.validatePythonResponse rejects missing task_id or title', () => {
  const corrupted = JSON.parse(JSON.stringify(mockPythonValidResponse));
  delete corrupted.recommendations.work_break.task_id;

  assert.throws(
    () => dincharyaService.validatePythonResponse(corrupted),
    (err) => err.statusCode === 502 && err.message.includes('task_id')
  );
});

test('4. dincharyaService.fetchRecommendations handles network error (503)', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new TypeError('fetch failed (ECONNREFUSED)');
  };

  try {
    await assert.rejects(
      async () => {
        await dincharyaService.fetchRecommendations({
          primaryDosha: 'vata-pitta',
          breakStart: '13:00',
          breakEnd: '13:10',
          returnHomeTime: '18:30',
          sleepTime: '23:00',
          wakeTime: '06:30',
        });
      },
      (err) => err.statusCode === 503 && err.message.includes('currently unavailable')
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('5. dincharyaService.fetchRecommendations handles timeout (503)', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    const timeoutErr = new Error('The operation was aborted due to timeout');
    timeoutErr.name = 'TimeoutError';
    throw timeoutErr;
  };

  try {
    await assert.rejects(
      async () => {
        await dincharyaService.fetchRecommendations({
          primaryDosha: 'vata-pitta',
          breakStart: '13:00',
          breakEnd: '13:10',
          returnHomeTime: '18:30',
          sleepTime: '23:00',
          wakeTime: '06:30',
        });
      },
      (err) => err.statusCode === 503 && err.message.includes('timed out')
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('6. dincharyaController rejects client-supplied dosha or task labels (400)', async () => {
  const req = {
    user: { _id: 'user123', primaryDosha: 'Vata' },
    body: {
      primary_dosha: 'kapha', // Client attempting to inject dosha
      break_start: '13:00',
      break_end: '13:10',
      return_home_time: '18:30',
      sleep_time: '23:00',
      wake_time: '06:30',
    },
  };

  let responseStatus = null;
  let responseJson = null;
  const res = {
    status: (code) => {
      responseStatus = code;
      return {
        json: (data) => {
          responseJson = data;
        },
      };
    },
  };

  await dincharyaController.getRecommendations(req, res, () => {});
  assert.equal(responseStatus, 400);
  assert.equal(responseJson.ok, false);
  assert.match(responseJson.message, /not permitted/);
});

test('7. dincharyaController rejects invalid time format (400)', async () => {
  const req = {
    user: { _id: 'user123', primaryDosha: 'Vata' },
    body: {
      break_start: '25:00', // Invalid hour
      break_end: '13:10',
      return_home_time: '18:30',
      sleep_time: '23:00',
      wake_time: '06:30',
    },
  };

  let responseStatus = null;
  let responseJson = null;
  const res = {
    status: (code) => {
      responseStatus = code;
      return {
        json: (data) => {
          responseJson = data;
        },
      };
    },
  };

  await dincharyaController.getRecommendations(req, res, () => {});
  assert.equal(responseStatus, 400);
  assert.equal(responseJson.ok, false);
  assert.match(responseJson.message, /Invalid 24-hour time format/);
});

test('8. dincharyaController rejects break ending before or equal to start time (400)', async () => {
  const req = {
    user: { _id: 'user123', primaryDosha: 'Vata' },
    body: {
      break_start: '13:30',
      break_end: '13:00', // earlier than start
      return_home_time: '18:30',
      sleep_time: '23:00',
      wake_time: '06:30',
    },
  };

  let responseStatus = null;
  let responseJson = null;
  const res = {
    status: (code) => {
      responseStatus = code;
      return {
        json: (data) => {
          responseJson = data;
        },
      };
    },
  };

  await dincharyaController.getRecommendations(req, res, () => {});
  assert.equal(responseStatus, 400);
  assert.equal(responseJson.ok, false);
  assert.match(responseJson.message, /later than start time/);
});

test('9. dincharyaController returns DOSHA_ASSESSMENT_REQUIRED if user has no saved dosha (400)', async () => {
  const req = {
    user: { _id: 'user123', primaryDosha: null },
    body: {
      break_start: '13:00',
      break_end: '13:10',
      return_home_time: '18:30',
      sleep_time: '23:00',
      wake_time: '06:30',
    },
  };

  let responseStatus = null;
  let responseJson = null;
  const res = {
    status: (code) => {
      responseStatus = code;
      return {
        json: (data) => {
          responseJson = data;
        },
      };
    },
  };

  await dincharyaController.getRecommendations(req, res, () => {});
  assert.equal(responseStatus, 400);
  assert.equal(responseJson.ok, false);
  assert.equal(responseJson.code, 'DOSHA_ASSESSMENT_REQUIRED');
});

test('10. dincharyaController calls Python service with saved dosha and returns 4 recommendations', async () => {
  let capturedFetchUrl = null;
  let capturedFetchBody = null;

  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    capturedFetchUrl = url;
    capturedFetchBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => mockPythonValidResponse,
    };
  };

  try {
    const req = {
      user: { _id: 'user123', primaryDosha: 'Vata-Pitta' },
      body: {
        break_start: '13:00',
        break_end: '13:15',
        return_home_time: '18:30',
        sleep_time: '23:00',
        wake_time: '06:30',
      },
    };

    let responseStatus = null;
    let responseJson = null;
    const res = {
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => {
            responseJson = data;
          },
        };
      },
    };

    await dincharyaController.getRecommendations(req, res, () => {});

    assert.equal(responseStatus, 200);
    assert.equal(responseJson.ok, true);
    assert.equal(Object.keys(responseJson.recommendations).length, 4);

    // Verify Python service was called with normalized dosha from DB and NOT from body
    assert.match(capturedFetchUrl, /\/recommend$/);
    assert.equal(capturedFetchBody.primary_dosha, 'vata-pitta');
    assert.equal(capturedFetchBody.break_start, '13:00');
    assert.equal(capturedFetchBody.break_end, '13:15');
    assert.equal(capturedFetchBody.return_home_time, '18:30');
    assert.equal(capturedFetchBody.sleep_time, '23:00');
    assert.equal(capturedFetchBody.wake_time, '06:30');
  } finally {
    global.fetch = originalFetch;
  }
});

test('11. dincharya router mounts POST /recommend with requireAuth middleware', () => {
  const dincharyaRouter = require('../src/routes/dincharya.routes');
  const route = dincharyaRouter.stack.find(
    (layer) => layer.route && layer.route.path === '/recommend' && layer.route.methods.post
  );
  assert.ok(route, 'POST /recommend route should be defined');
  assert.ok(route.route.stack.length >= 2, 'Route should have middleware stack (auth, limiter, handler)');
});
