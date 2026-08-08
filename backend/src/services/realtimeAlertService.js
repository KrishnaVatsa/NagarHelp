import Alert from '../models/alert.model.js';
import { sendWhatsAppNotification, sendEmailNotification } from './notificationService.js';

const MAX_RETRIES = 2;

/**
 * Creates an Alert record and attempts delivery via WhatsApp/Email.
 * Retries immediately up to MAX_RETRIES times on failure, then marks as
 * 'failed' for later manual/cron-based retry (record stays in DB either way).
 */
export const triggerAlert = async ({ type, severity = 'High', message, relatedIssue = null, channel = 'both' }) => {
  const alert = await Alert.create({
    type,
    severity,
    message,
    relatedIssue,
    channel,
    status: 'pending'
  });

  await attemptDelivery(alert);
  return alert;
};

const attemptDelivery = async (alert) => {
  const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER;
  const adminEmail = process.env.ADMIN_EMAIL;

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const results = {};

      if ((alert.channel === 'whatsapp' || alert.channel === 'both') && adminPhone) {
        const r = await sendWhatsAppNotification(adminPhone, `🚨 *${alert.severity} Alert*\n\n${alert.message}`);
        if (!r.success) throw new Error(r.error || 'WhatsApp send failed');
        results.whatsapp = r;
      }

      if ((alert.channel === 'email' || alert.channel === 'both') && adminEmail) {
        const r = await sendEmailNotification(
          adminEmail,
          `🚨 ${alert.severity} Alert: ${alert.type}`,
          `<p>${alert.message}</p>`
        );
        if (!r.success) throw new Error(r.error || 'Email send failed');
        results.email = r;
      }

      // Success - mark sent and stop retrying
      alert.status = 'sent';
      alert.retryCount = attempt;
      alert.lastError = null;
      await alert.save();
      return results;
    } catch (error) {
      lastError = error.message;
      console.error(`Alert delivery attempt ${attempt + 1} failed:`, error.message);
    }
  }

  // All attempts exhausted
  alert.status = 'failed';
  alert.retryCount = MAX_RETRIES + 1;
  alert.lastError = lastError;
  await alert.save();
  return { success: false, error: lastError };
};

/**
 * Re-attempts delivery for a previously failed alert (e.g. triggered manually
 * from an admin dashboard "Retry" button).
 */
export const retryAlert = async (alertId) => {
  const alert = await Alert.findById(alertId);
  if (!alert) throw new Error('Alert not found');
  return attemptDelivery(alert);
};

/**
 * Simple rule check: decides whether a civic issue qualifies as a
 * critical/high-priority event that should trigger a real-time alert.
 */
export const shouldTriggerAlert = (civicIssue) => {
  if (civicIssue.priority === 'High') return true;
  if (civicIssue.flags?.includes('suspicious_image') === false && civicIssue.category === 'Safety') return true;
  return false;
};