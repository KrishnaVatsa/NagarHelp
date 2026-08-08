import CivicIssue from '../models/civicIssue.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * Returns clustered hotspot data: groups nearby issues into grid cells
 * (roughly ~100m squares) so the frontend can render markers sized/colored
 * by density on a map. Also supports optional category and date filters.
 */
export const getHotspots = asyncHandler(async (req, res) => {
  const { category, status, days } = req.query;

  const match = {};
  if (category) match.category = category;
  if (status) match.status = status;
  if (days) {
    const lookback = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
    match.createdAt = { $gte: lookback };
  }

  // Grid size ~0.001 degrees (~111m at the equator) - good enough for city-block clustering
  const GRID_SIZE = 0.001;

  const hotspots = await CivicIssue.aggregate([
    { $match: match },
    {
      $project: {
        category: 1,
        status: 1,
        priority: 1,
        createdAt: 1,
        lng: { $arrayElemAt: ['$location.coordinates', 0] },
        lat: { $arrayElemAt: ['$location.coordinates', 1] },
        address: '$location.address'
      }
    },
    {
      $project: {
        category: 1,
        status: 1,
        priority: 1,
        createdAt: 1,
        address: 1,
        gridLng: { $multiply: [{ $round: [{ $divide: ['$lng', GRID_SIZE] }, 0] }, GRID_SIZE] },
        gridLat: { $multiply: [{ $round: [{ $divide: ['$lat', GRID_SIZE] }, 0] }, GRID_SIZE] }
      }
    },
    {
      $group: {
        _id: { gridLng: '$gridLng', gridLat: '$gridLat' },
        count: { $sum: 1 },
        categories: { $push: '$category' },
        sampleAddress: { $first: '$address' },
        highPriorityCount: {
          $sum: { $cond: [{ $eq: ['$priority', 'High'] }, 1, 0] }
        },
        latestReport: { $max: '$createdAt' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 100 }
  ]);

  const formatted = hotspots.map((h) => ({
    longitude: h._id.gridLng,
    latitude: h._id.gridLat,
    count: h.count,
    highPriorityCount: h.highPriorityCount,
    sampleAddress: h.sampleAddress,
    latestReport: h.latestReport,
    topCategory: mostFrequent(h.categories)
  }));

  return res.status(200).json(
    new ApiResponse(200, formatted, 'Hotspot data retrieved successfully')
  );
});

/**
 * Returns time-series trend data: issue counts grouped by day and category,
 * for charting on the dashboard.
 */
export const getTrends = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const lookback = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

  const trends = await CivicIssue.aggregate([
    { $match: { createdAt: { $gte: lookback } } },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          category: '$category'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.date': 1 } }
  ]);

  // Reshape into { date, category, count } flat array - easy for frontend charting libs
  const formatted = trends.map((t) => ({
    date: t._id.date,
    category: t._id.category,
    count: t.count
  }));

  return res.status(200).json(
    new ApiResponse(200, formatted, 'Trend data retrieved successfully')
  );
});

function mostFrequent(arr) {
  const counts = {};
  let max = 0;
  let result = arr[0];
  for (const item of arr) {
    counts[item] = (counts[item] || 0) + 1;
    if (counts[item] > max) {
      max = counts[item];
      result = item;
    }
  }
  return result;
}