import express from 'express';
import { downloadPlayersImages } from '../controllers/playersImagesControllers';

const router = express.Router();

router.get('/', downloadPlayersImages);

export default router;
