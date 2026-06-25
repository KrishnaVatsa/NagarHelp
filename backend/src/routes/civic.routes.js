import express from 'express';
import {
  createCivicIssue,
  getAllCivicIssues,
  getCivicIssueById,
  updateCivicIssue,
  upvoteCivicIssue,
  addCommentToCivicIssue,
  deleteCivicIssue,
  getNearbyIssues,
  getCivicIssueStats
} from '../controllers/civic.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';

const router = express.Router();

// Public routes
router.get('/nearby', getNearbyIssues);
router.get('/stats', getCivicIssueStats);
router.get('/:issueId', getCivicIssueById);
router.get('/', getAllCivicIssues);

// Protected routes
router.use(verifyJWT);

router.post('/', upload.array('images', 5), createCivicIssue);
router.patch('/:issueId', updateCivicIssue);
router.post('/:issueId/upvote', upvoteCivicIssue);
router.post('/:issueId/comment', addCommentToCivicIssue);
router.delete('/:issueId', deleteCivicIssue);

export default router;
