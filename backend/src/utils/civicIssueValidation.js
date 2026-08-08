import CivicIssue from '../models/civicIssue.model.js';

const VALID_CATEGORIES = ['Pothole', 'Garbage', 'Safety', 'Waterlogging', 'Streetlight', 'Drainage', 'Other'];

/**
 * Validates structural correctness of incoming civic issue data.
 * Returns an array of error strings (empty array = valid).
 */
export const validateIssueInput = ({ title, category, parsedLocation }) => {
  const errors = [];

  if (!title || title.trim().length < 5) {
    errors.push('Title must be at least 5 characters long');
  }

  if (!VALID_CATEGORIES.includes(category)) {
    errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  const lat = parsedLocation?.latitude;
  const lng = parsedLocation?.longitude;

  if (typeof lat !== 'number' || lat < -90 || lat > 90) {
    errors.push('Latitude must be a number between -90 and 90');
  }
  if (typeof lng !== 'number' || lng < -180 || lng > 180) {
    errors.push('Longitude must be a number between -180 and 180');
  }

  return errors;
};

/**
 * Checks for likely duplicate reports: same category, within a small radius,
 * created recently, and not already resolved/rejected.
 */
export const findPotentialDuplicate = async ({ category, longitude, latitude }) => {
  const RADIUS_METERS = 75;
  const LOOKBACK_DAYS = 7;
  const lookbackDate = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const duplicate = await CivicIssue.findOne({
    category,
    status: { $nin: ['Resolved', 'Rejected'] },
    createdAt: { $gte: lookbackDate },
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: RADIUS_METERS
      }
    }
  });

  return duplicate;
};

/**
 * Flags a report as suspicious based on AI analysis result and basic heuristics.
 */
export const computeFlags = ({ aiAnalysis, description, hasImages, isAiSupportedCategory }) => {
  const flags = [];

  if (isAiSupportedCategory && aiAnalysis?.isReal === false) {
    flags.push('suspicious_image');
  }

  if (isAiSupportedCategory && aiAnalysis?.isReal === true && aiAnalysis?.confidence < 0.5) {
    flags.push('low_confidence_image');
  }

  if (!description || description.trim().length < 10) {
    flags.push('no_description');
  }

  if (isAiSupportedCategory && !hasImages) {
    flags.push('no_image_for_ai_category');
  }

  return flags;
};