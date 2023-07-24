import express from 'express';
import { downloadImages } from '../controllers/teamImagesController';

const router = express.Router();

router.get('/', downloadImages);

export default router;
