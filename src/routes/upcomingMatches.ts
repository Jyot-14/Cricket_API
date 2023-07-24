import express from 'express';
import { getUpcomingMatches } from '../controllers/upcomingMatchesController';

const router = express.Router();

router.get('/', getUpcomingMatches);

export default router;
