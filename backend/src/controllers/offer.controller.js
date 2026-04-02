import Offer from '../models/Offer.model.js';
import NFT from '../models/NFT.model.js';

// @desc    Make an offer
export const makeOffer = async (req, res) => {
  try {
    const { nftId, amount, amountEth, duration, buyerAddress, nftContractAddress, tokenId } = req.body;

    const nft = await NFT.findById(nftId);
    if (!nft) return res.status(404).json({ success: false, message: 'NFT not found' });

    const expirationTime = new Date(Date.now() + duration * 1000);

    const offer = await Offer.create({
      nft: nftId,
      buyer: req.user._id,
      buyerAddress,
      seller: nft.owner,
      amount,
      amountEth,
      expirationTime,
      duration,
      nftContractAddress,
      tokenId,
    });

    const populated = await offer.populate(['nft', 'buyer', 'seller']);
    res.status(201).json({ success: true, offer: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get offers for an NFT
export const getNFTOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ nft: req.params.nftId, status: 'active' })
      .populate('buyer', 'username avatar walletAddress')
      .sort({ amount: -1 });
    res.json({ success: true, offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Accept offer
export const acceptOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('nft');
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    if (offer.nft.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (!offer.isValid) {
      return res.status(400).json({ success: false, message: 'Offer is no longer valid' });
    }

    offer.accepted = true;
    offer.status = 'accepted';
    await offer.save();

    // Transfer ownership
    await NFT.findByIdAndUpdate(offer.nft._id, { owner: offer.buyer, sold: true });

    res.json({ success: true, offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cancel offer
export const cancelOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    if (offer.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    offer.cancelled = true;
    offer.status = 'cancelled';
    await offer.save();
    res.json({ success: true, message: 'Offer cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get my offers (made)
export const getMyOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ buyer: req.user._id })
      .populate('nft', 'name image')
      .populate('seller', 'username avatar')
      .sort({ createdAt: -1 });
    res.json({ success: true, offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get received offers
export const getReceivedOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ seller: req.user._id, status: 'active' })
      .populate('nft', 'name image')
      .populate('buyer', 'username avatar')
      .sort({ amount: -1 });
    res.json({ success: true, offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
