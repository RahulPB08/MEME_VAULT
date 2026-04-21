import Auction from '../models/Auction.model.js';
import NFT from '../models/NFT.model.js';

// @desc    Create auction
// @route   POST /api/auctions
export const createAuction = async (req, res) => {
  try {
    const { nftId, tokenId, startingPrice, startingPriceEth, reservePrice, duration, nftContractAddress, transactionHash, sellerAddress } = req.body;

    const nft = await NFT.findById(nftId);
    if (!nft) return res.status(404).json({ success: false, message: 'NFT not found' });
    if (nft.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const endTime = new Date(Date.now() + duration * 1000);

    const auction = await Auction.create({
      nft: nftId,
      tokenId,
      seller: req.user._id,
      sellerAddress,
      startingPrice,
      startingPriceEth,
      reservePrice: reservePrice || 0,
      endTime,
      duration,
      nftContractAddress,
      transactionHash: transactionHash || '',
    });

    // Mark NFT as on auction
    await NFT.findByIdAndUpdate(nftId, { onAuction: true, auctionId: auction._id, listed: false });

    const populated = await auction.populate(['nft', 'seller']);
    res.status(201).json({ success: true, auction: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all auctions
// @route   GET /api/auctions
export const getAuctions = async (req, res) => {
  try {
    const { status = 'active', page = 1, limit = 12 } = req.query;

    const query = {};
    if (status === 'active') {
      query.ended = false;
      query.cancelled = false;
      query.endTime = { $gt: new Date() };
    } else if (status === 'ended') {
      query.ended = true;
    } else if (status === 'cancelled') {
      query.cancelled = true;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Auction.countDocuments(query);

    const auctions = await Auction.find(query)
      .populate('nft', 'name image category')
      .populate('seller', 'username avatar walletAddress')
      .populate('highestBidder', 'username avatar')
      .sort({ endTime: 1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      auctions,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single auction
// @route   GET /api/auctions/:id
export const getAuction = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate('nft')
      .populate('seller', 'username avatar walletAddress isVerified')
      .populate('highestBidder', 'username avatar')
      .populate('winner', 'username avatar')
      .populate('bids.bidder', 'username avatar');

    if (!auction) return res.status(404).json({ success: false, message: 'Auction not found' });
    res.json({ success: true, auction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Place a bid
// @route   POST /api/auctions/:id/bid
export const placeBid = async (req, res) => {
  try {
    const { amount, amountEth, txHash, bidderAddress } = req.body;
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ success: false, message: 'Auction not found' });
    if (auction.ended || auction.cancelled) {
      return res.status(400).json({ success: false, message: 'Auction is not active' });
    }
    if (new Date() > auction.endTime) {
      return res.status(400).json({ success: false, message: 'Auction has ended' });
    }

    auction.highestBid = amount;
    auction.highestBidEth = amountEth;
    auction.highestBidder = req.user._id;
    auction.highestBidderAddress = bidderAddress;
    auction.bids.push({
      bidder: req.user._id,
      bidderAddress,
      amount,
      amountEth,
      txHash,
    });

    await auction.save();
    const populated = await auction.populate(['nft', 'seller', 'highestBidder']);
    res.json({ success: true, auction: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    End auction
// @route   PUT /api/auctions/:id/end
export const endAuction = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ success: false, message: 'Auction not found' });

    auction.ended = true;
    if (auction.highestBidder) auction.winner = auction.highestBidder;
    await auction.save();

    // Update NFT owner if sold
    if (auction.highestBidder) {
      await NFT.findByIdAndUpdate(auction.nft, {
        owner: auction.highestBidder,
        onAuction: false,
        sold: true,
        $push: { history: { event: 'auction', from: auction.sellerAddress, to: auction.highestBidderAddress, price: auction.highestBid } },
      });
    } else {
      await NFT.findByIdAndUpdate(auction.nft, { onAuction: false });
    }

    res.json({ success: true, auction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cancel auction (only seller, no bids)
// @route   PUT /api/auctions/:id/cancel
export const cancelAuction = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ success: false, message: 'Auction not found' });
    if (auction.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (auction.bids && auction.bids.length > 0) {
      return res.status(400).json({ success: false, message: 'Cannot cancel auction with active bids' });
    }

    auction.cancelled = true;
    await auction.save();

    // Restore NFT status
    await NFT.findByIdAndUpdate(auction.nft, { onAuction: false, auctionId: null });

    res.json({ success: true, auction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
