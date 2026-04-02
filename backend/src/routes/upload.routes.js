import { Router } from 'express';
import { uploadImage, uploadMetadata } from '../controllers/upload.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/image', protect, uploadImage);
router.post('/metadata', protect, uploadMetadata);

export default router;
