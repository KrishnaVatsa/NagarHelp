import CivicIssue from '../models/civicIssue.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadFile, deleteFile } from '../services/storageService.js';
import { analyzeMultipleCivicImages, summarizeAnalysis, loadCivicDetectorModel } from '../services/civicDetectorService.js';
import { notifyAdminsAboutNewIssue, notifyUserAboutSubmission } from '../services/notificationService.js';


// Create a new civic issue
export const createCivicIssue = asyncHandler(async (req, res) => {
  const { title, description, category, location, address } = req.body;

  if (!title || !category || !location) {
    throw new ApiError(400, 'Title, category, and location are required');
  }

  // Parse location if it's a JSON string (from FormData)
  let parsedLocation = location;
  if (typeof location === 'string') {
    try {
      parsedLocation = JSON.parse(location);
    } catch (err) {
      throw new ApiError(400, 'Invalid location format');
    }
  }

  if (!parsedLocation.latitude || !parsedLocation.longitude) {
    throw new ApiError(400, 'Location must include valid latitude and longitude');
  }

  const civicIssueData = {
    title,
    description,
    category,
    location: {
      type: 'Point',
      coordinates: [parsedLocation.longitude, parsedLocation.latitude],
      address
    },
    reportedBy: req.user._id
  };

  // AI image analysis covers Pothole, Garbage, Waterlogging, and Drainage
  // reports. Waterlogging and Drainage share one model class ("water_issue")
  // since their photos look visually similar (standing/overflowing water).
  // Other categories (Safety, Streetlight, Other) skip AI checking and go
  // straight to manual/community review.
  const CATEGORY_TO_MODEL_CLASS = {
    Pothole: 'pothole',
    Garbage: 'garbage',
    Waterlogging: 'water_issue',
    Drainage: 'water_issue'
  };
  const expectedModelClass = CATEGORY_TO_MODEL_CLASS[category] || null;
  const isAiSupportedCategory = expectedModelClass !== null;

  // Analyze and upload images if provided
  if (req.files && req.files.length > 0) {
    try {
      let summary = null;

      if (isAiSupportedCategory) {
        // Load model before analysis
        await loadCivicDetectorModel();

        // Get image paths
        const imagePaths = req.files.map(file => file.path);

        // Analyze all images against the expected category class
        const analysisResults = await analyzeMultipleCivicImages(imagePaths, expectedModelClass);

        // Summarize analysis
        summary = summarizeAnalysis(analysisResults);

        // Store AI analysis results
        civicIssueData.aiAnalysis = {
          isReal: summary.isReal,
          confidence: summary.confidence,
          category: summary.predictedClass,
          summary: summary.summary,
          analyzedAt: new Date()
        };

        console.log('Civic issue analysis:', civicIssueData.aiAnalysis);
      } else {
        // Category not covered by the AI model - skip analysis,
        // mark for manual/community review instead.
        civicIssueData.aiAnalysis = {
          isReal: null,
          confidence: null,
          summary: 'AI analysis not available for this category - pending manual review',
          analyzedAt: new Date()
        };
      }

      // Upload images to Firebase Storage
      const uploadPromises = req.files.map((file) =>
        uploadFile(file.path, 'civic-issues')
      );

      const uploadedImageUrls = await Promise.all(uploadPromises);
      civicIssueData.images = uploadedImageUrls.filter(url => url !== null);
    } catch (error) {
      console.error('Error during image analysis:', error);
      // Still continue with issue creation even if analysis fails
      civicIssueData.aiAnalysis = {
        isReal: null,
        confidence: 0,
        summary: 'Analysis failed - manual review required',
        analyzedAt: new Date()
      };
      
      // Try to upload images anyway
      const uploadPromises = req.files.map((file) =>
        uploadFile(file.path, 'civic-issues').catch(() => null)
      );
      const uploadedImageUrls = await Promise.allSettled(uploadPromises);
      civicIssueData.images = uploadedImageUrls
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value);
    }
  }

  const civicIssue = await CivicIssue.create(civicIssueData);

  // Populate user info for response and notifications
  await civicIssue.populate('reportedBy', 'name email phone');

  // Send notifications to admins and user
  try {
    await notifyAdminsAboutNewIssue(civicIssue, civicIssue.reportedBy);
    await notifyUserAboutSubmission(civicIssue.reportedBy, civicIssue);
  } catch (notificationError) {
    console.error('Notification error (non-blocking):', notificationError.message);
    // Don't fail the request if notifications fail
  }

  return res.status(201).json(
    new ApiResponse(201, civicIssue, 'Civic issue reported successfully')
  );
});

// Get all civic issues with filters
export const getAllCivicIssues = asyncHandler(async (req, res) => {
  const { category, status, page = 1, limit = 10, sortBy = '-createdAt' } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (category) filter.category = category;
  if (status) filter.status = status;

  const issues = await CivicIssue.find(filter)
    .populate('reportedBy', 'name email avatar')
    .populate('assignedTo', 'name email')
    .sort(sortBy)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await CivicIssue.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(200, {
      issues,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    }, 'Civic issues retrieved successfully')
  );
});

// Get civic issues near a location
export const getNearbyIssues = asyncHandler(async (req, res) => {
  const { longitude, latitude, maxDistance = 5000 } = req.query; // maxDistance in meters

  if (!longitude || !latitude) {
    throw new ApiError(400, 'Longitude and latitude are required');
  }

  const issues = await CivicIssue.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        },
        $maxDistance: parseInt(maxDistance)
      }
    }
  })
    .populate('reportedBy', 'name email')
    .populate('assignedTo', 'name email')
    .sort('-priority -createdAt');

  return res.status(200).json(
    new ApiResponse(200, issues, 'Nearby civic issues retrieved successfully')
  );
});

// Get single civic issue
export const getCivicIssueById = asyncHandler(async (req, res) => {
  const { issueId } = req.params;

  const issue = await CivicIssue.findById(issueId)
    .populate('reportedBy', 'name email avatar phone')
    .populate('assignedTo', 'name email')
    .populate('resolvedBy', 'name email')
    .populate('comments.author', 'name email avatar');

  if (!issue) {
    throw new ApiError(404, 'Civic issue not found');
  }

  return res.status(200).json(
    new ApiResponse(200, issue, 'Civic issue details retrieved successfully')
  );
});

// Update civic issue
export const updateCivicIssue = asyncHandler(async (req, res) => {
  const { issueId } = req.params;
  const { status, priority, assignedDepartment, assignedTo } = req.body;

  const issue = await CivicIssue.findById(issueId);

  if (!issue) {
    throw new ApiError(404, 'Civic issue not found');
  }

  // Only admin or original reporter can update
  if (issue.reportedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to update this issue');
  }

  if (status) issue.status = status;
  if (priority) issue.priority = priority;
  if (assignedDepartment) issue.assignedDepartment = assignedDepartment;
  if (assignedTo) issue.assignedTo = assignedTo;

  if (status === 'Resolved' && !issue.resolvedAt) {
    issue.resolvedAt = new Date();
    issue.resolvedBy = req.user._id;
  }

  const updatedIssue = await issue.save();

  return res.status(200).json(
    new ApiResponse(200, updatedIssue, 'Civic issue updated successfully')
  );
});

// Upvote civic issue
export const upvoteCivicIssue = asyncHandler(async (req, res) => {
  const { issueId } = req.params;

  const issue = await CivicIssue.findById(issueId);

  if (!issue) {
    throw new ApiError(404, 'Civic issue not found');
  }

  if (issue.upvoters.includes(req.user._id)) {
    // Remove upvote if already upvoted
    issue.upvoters = issue.upvoters.filter((id) => id.toString() !== req.user._id.toString());
    issue.upvotes -= 1;
  } else {
    // Add upvote
    issue.upvoters.push(req.user._id);
    issue.upvotes += 1;
  }

  const updatedIssue = await issue.save();

  return res.status(200).json(
    new ApiResponse(200, updatedIssue, 'Upvote processed successfully')
  );
});

// Add comment to civic issue
export const addCommentToCivicIssue = asyncHandler(async (req, res) => {
  const { issueId } = req.params;
  const { text } = req.body;

  if (!text) {
    throw new ApiError(400, 'Comment text is required');
  }

  const issue = await CivicIssue.findById(issueId);

  if (!issue) {
    throw new ApiError(404, 'Civic issue not found');
  }

  issue.comments.push({
    author: req.user._id,
    text,
    createdAt: new Date()
  });

  const updatedIssue = await issue.save();

  return res.status(200).json(
    new ApiResponse(200, updatedIssue, 'Comment added successfully')
  );
});

// Delete civic issue
export const deleteCivicIssue = asyncHandler(async (req, res) => {
  const { issueId } = req.params;

  const issue = await CivicIssue.findById(issueId);

  if (!issue) {
    throw new ApiError(404, 'Civic issue not found');
  }

  // Only reporter or admin can delete
  if (issue.reportedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to delete this issue');
  }

  // Delete images from Firebase Storage
  if (issue.images && issue.images.length > 0) {
    for (const imageUrl of issue.images) {
      await deleteFile(imageUrl);
    }
  }

  await CivicIssue.findByIdAndDelete(issueId);

  return res.status(200).json(
    new ApiResponse(200, {}, 'Civic issue deleted successfully')
  );
});

// Get civic issue statistics
export const getCivicIssueStats = asyncHandler(async (req, res) => {
  const stats = await CivicIssue.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        pending: {
          $sum: {
            $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0]
          }
        },
        inProgress: {
          $sum: {
            $cond: [{ $eq: ['$status', 'In-Progress'] }, 1, 0]
          }
        },
        resolved: {
          $sum: {
            $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0]
          }
        }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const totalIssues = await CivicIssue.countDocuments();
  const resolvedIssues = await CivicIssue.countDocuments({ status: 'Resolved' });

  return res.status(200).json(
    new ApiResponse(200, {
      stats,
      summary: {
        total: totalIssues,
        resolved: resolvedIssues,
        pending: totalIssues - resolvedIssues,
        resolutionRate: ((resolvedIssues / totalIssues) * 100).toFixed(2) + '%'
      }
    }, 'Statistics retrieved successfully')
  );
});
