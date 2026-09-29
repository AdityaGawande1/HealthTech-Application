import { testService } from '../service/index.js';
import { validateTestResult } from '../validation/index.js';

export const getTestResults = async (req, res, next) => {
  try {
    const tests = await testService.findByPatientId(req.params.id, req.query.biomarker);
    res.json({ success: true, data: tests, message: 'Test results loaded', errors: [] });
  } catch (err) {
    next(err);
  }
};

export const createTestResult = async (req, res, next) => {
  try {
    const testResult = await testService.create(req.params.id, validateTestResult(req.body));
    res.status(201).json({ success: true, data: testResult, message: 'Test result created', errors: [] });
  } catch (err) {
    next(err);
  }
};

export const deleteTestResult = async (req, res, next) => {
  try {
    await testService.delete(req.params.testId);
    res.json({ success: true, data: null, message: 'Test result deleted', errors: [] });
  } catch (err) {
    next(err);
  }
};
