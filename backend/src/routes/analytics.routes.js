import express from 'express';
import { getHotspots, getTrends } from '../controllers/analytics.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(verifyJWT);

router.get('/hotspots', getHotspots);
router.get('/trends', getTrends);

export default router;