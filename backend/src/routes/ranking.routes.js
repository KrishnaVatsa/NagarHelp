import express from 'express';
import { getRankedIssues } from '../controllers/ranking.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(verifyJWT);

router.get('/', getRankedIssues);

export default router;