// cricketRoutes.ts
import express from 'express';
import { fetchScorecard } from '../controllers/scoreCard';

const router = express.Router();

// Route to fetch and process scorecard
router.get('/', fetchScorecard);

export default router;
