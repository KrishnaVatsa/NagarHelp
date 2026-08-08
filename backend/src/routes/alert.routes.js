import express from 'express';
import { getAlerts, markAlertRead, retryFailedAlert } from '../controllers/alert.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(verifyJWT);

router.get('/', getAlerts);
router.patch('/:alertId/read', markAlertRead);
router.post('/:alertId/retry', retryFailedAlert);

export default router;