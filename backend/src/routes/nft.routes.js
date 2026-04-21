import { Router } from 'express';
import { createNFT, getNFTs, getNFT, toggleLike, updateNFT, buyNFT, getTrendingNFTs, getStats } from '../controllers/nft.controller.js';
import { protect, optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/stats', getStats);
router.get('/trending', getTrendingNFTs);
router.get('/', getNFTs);
router.get('/:id', optionalAuth, getNFT);
router.post('/', protect, createNFT);
router.put('/:id', protect, updateNFT);
router.post('/:id/buy', protect, buyNFT);
router.post('/:id/like', protect, toggleLike);

export default router;
