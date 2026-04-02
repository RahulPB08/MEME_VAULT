import { Router } from 'express';
import { makeOffer, getNFTOffers, acceptOffer, cancelOffer, getMyOffers, getReceivedOffers } from '../controllers/offer.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/my', protect, getMyOffers);
router.get('/received', protect, getReceivedOffers);
router.get('/nft/:nftId', getNFTOffers);
router.post('/', protect, makeOffer);
router.put('/:id/accept', protect, acceptOffer);
router.put('/:id/cancel', protect, cancelOffer);

export default router;
