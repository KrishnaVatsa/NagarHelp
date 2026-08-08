import Alert from '../models/alert.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { retryAlert } from '../services/realtimeAlertService.js';

// Get alerts, optionally filtered by read state
export const getAlerts = asyncHandler(async (req, res) => {
  const { read, severity, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (read !== undefined) filter.read = read === 'true';
  if (severity) filter.severity = severity;

  const alerts = await Alert.find(filter)
    .populate('relatedIssue', 'title category location')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const unreadCount = await Alert.countDocuments({ read: false });

  return res.status(200).json(
    new ApiResponse(200, { alerts, unreadCount }, 'Alerts retrieved successfully')
  );
});

// Mark a single alert as read
export const markAlertRead = asyncHandler(async (req, res) => {
  const { alertId } = req.params;

  const alert = await Alert.findByIdAndUpdate(alertId, { read: true }, { new: true });
  if (!alert) {
    throw new ApiError(404, 'Alert not found');
  }

  return res.status(200).json(
    new ApiResponse(200, alert, 'Alert marked as read')
  );
});

// Manually retry a failed alert
export const retryFailedAlert = asyncHandler(async (req, res) => {
  const { alertId } = req.params;

  const result = await retryAlert(alertId);

  return res.status(200).json(
    new ApiResponse(200, result, 'Retry attempted')
  );
});