import express from 'express';
import { addPlayersData } from '../controllers/playersDataController';

const router = express.Router();

router.get('/', addPlayersData);

export default router;
