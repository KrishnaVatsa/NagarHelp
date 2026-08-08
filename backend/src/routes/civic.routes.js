// import express from 'express';
// import {
//   createCivicIssue,
//   getAllCivicIssues,
//   getCivicIssueById,
//   updateCivicIssue,
//   upvoteCivicIssue,
//   addCommentToCivicIssue,
//   deleteCivicIssue,
//   getNearbyIssues,
//   getCivicIssueStats,
//   getCivicIssueStatusHistory
// } from '../controllers/civic.controller.js';
// import { verifyJWT } from '../middlewares/auth.middleware.js';
// import { upload } from '../middlewares/multer.middleware.js';

// const router = express.Router();


// // Public routes
// router.get('/nearby', getNearbyIssues);
// router.get('/stats', getCivicIssueStats);
// router.get('/:issueId', getCivicIssueById);
// router.get('/', getAllCivicIssues);

// // Protected routes
// router.use(verifyJWT);

// router.post('/', upload.array('images', 5), createCivicIssue);
// router.patch('/:issueId', updateCivicIssue);
// router.get('/:issueId/history', getCivicIssueStatusHistory);
// router.post('/:issueId/upvote', upvoteCivicIssue);
// router.post('/:issueId/comment', addCommentToCivicIssue);
// router.delete('/:issueId', deleteCivicIssue);

// export default router;

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
  getCivicIssueStats,
  getCivicIssueStatusHistory,
  addAttachmentToIssue,
  getIssuesForMyRole,
  exportIssueReportHtml,
  exportIssueReportCsv
} from '../controllers/civic.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';

const router = express.Router();

// ── Public routes ──
router.get('/nearby', getNearbyIssues);
router.get('/stats', getCivicIssueStats);

// IMPORTANT: '/my-view' must come BEFORE '/:issueId' below, otherwise
// Express would treat "my-view" as an issueId and this route would
// never be reached.
router.get('/my-view', verifyJWT, getIssuesForMyRole);

router.get('/:issueId/export/html', exportIssueReportHtml);
router.get('/:issueId/export/csv', exportIssueReportCsv);
router.get('/:issueId', getCivicIssueById);
router.get('/', getAllCivicIssues);

// ── Protected routes ──
router.use(verifyJWT);

router.post('/', upload.array('images', 5), createCivicIssue);
router.patch('/:issueId', updateCivicIssue);
router.get('/:issueId/history', getCivicIssueStatusHistory);
router.post('/:issueId/upvote', upvoteCivicIssue);
router.post('/:issueId/comment', addCommentToCivicIssue);
router.post('/:issueId/attachment', upload.single('file'), addAttachmentToIssue);
router.delete('/:issueId', deleteCivicIssue);

export default router;