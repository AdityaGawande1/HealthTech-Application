import express from 'express';
import { getTestResults, createTestResult } from '../controller/index.js';

const router = express.Router({ mergeParams: true });

router.get('/', getTestResults);
router.post('/', createTestResult);

export default router;
