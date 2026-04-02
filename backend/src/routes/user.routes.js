import { Router } from 'express';
import { getUserProfile, updateProfile, toggleFollow, getTopCreators, getUserNFTs } from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/top-creators', getTopCreators);
router.get('/:identifier', getUserProfile);
router.put('/profile', protect, updateProfile);
router.post('/:id/follow', protect, toggleFollow);
router.get('/:id/nfts', getUserNFTs);

export default router;
