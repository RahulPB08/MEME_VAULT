import { Router } from 'express';
import { createAuction, getAuctions, getAuction, placeBid, endAuction } from '../controllers/auction.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', getAuctions);
router.get('/:id', getAuction);
router.post('/', protect, createAuction);
router.post('/:id/bid', protect, placeBid);
router.put('/:id/end', protect, endAuction);

export default router;
