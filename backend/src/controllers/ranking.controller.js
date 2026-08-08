import CivicIssue from '../models/civicIssue.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { rankIssues } from '../services/rankingService.js';

// Get open civic issues ranked by explainable priority score
export const getRankedIssues = asyncHandler(async (req, res) => {
  const { limit = 20, category } = req.query;

  const filter = { status: { $in: ['Pending', 'In-Progress'] } };
  if (category) filter.category = category;

  const issues = await CivicIssue.find(filter)
    .populate('reportedBy', 'name')
    .lean();

  // Count how many OTHER issues point to each issue as a duplicate
  const duplicateAgg = await CivicIssue.aggregate([
    { $match: { isDuplicate: true, duplicateOf: { $ne: null } } },
    { $group: { _id: '$duplicateOf', count: { $sum: 1 } } }
  ]);
  const duplicateCounts = {};
  duplicateAgg.forEach((d) => {
    duplicateCounts[d._id.toString()] = d.count;
  });

  const ranked = rankIssues(issues, duplicateCounts).slice(0, parseInt(limit));

  return res.status(200).json(
    new ApiResponse(200, ranked, 'Ranked issues retrieved successfully')
  );
});