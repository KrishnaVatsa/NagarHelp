import express from 'express';
import {
  handleWhatsappWebhook,
  getWhatsappLogs,
  linkMessageToCivicIssue,
  sendBroadcastMessage,
  notifyReporterStatusUpdate
} from '../controllers/whatsapp.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Webhook endpoint (no auth required - Whapi will call this)
router.post('/webhook', handleWhatsappWebhook);

// Protected routes
router.use(verifyJWT);

router.get('/logs', getWhatsappLogs);
router.post('/link', linkMessageToCivicIssue);
router.post('/broadcast', sendBroadcastMessage);
router.post('/notify-status', notifyReporterStatusUpdate);

export default router;
