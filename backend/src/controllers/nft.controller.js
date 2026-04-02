import NFT from '../models/NFT.model.js';
import User from '../models/User.model.js';

// @desc    Create / mint an NFT
// @route   POST /api/nfts
export const createNFT = async (req, res) => {
  try {
    const {
      name, description, image, ipfsHash, metadataUri,
      price, priceInEth, category, tags, tokenId,
      royaltyPercent, transactionHash, creatorAddress,
    } = req.body;

    const nft = await NFT.create({
      name, description, image, ipfsHash, metadataUri,
      price: price || 0, priceInEth: priceInEth || '0',
      category: category || 'other',
      tags: tags || [],
      tokenId: tokenId || null,
      royaltyPercent: royaltyPercent || 10,
      transactionHash: transactionHash || '',
      creatorAddress: creatorAddress || req.user.walletAddress || '',
      ownerAddress: creatorAddress || req.user.walletAddress || '',
      creator: req.user._id,
      owner: req.user._id,
      history: [{ event: 'mint', from: '', to: creatorAddress || '', price: 0, txHash: transactionHash || '' }],
    });

    // Update user nftsCreated count
    await User.findByIdAndUpdate(req.user._id, { $inc: { nftsCreated: 1 } });

    const populated = await nft.populate(['creator', 'owner']);
    res.status(201).json({ success: true, nft: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all NFTs (marketplace)
// @route   GET /api/nfts
export const getNFTs = async (req, res) => {
  try {
    const { page = 1, limit = 12, category, sort = 'newest', search, minPrice, maxPrice, listed } = req.query;

    const query = {};
    if (category && category !== 'all') query.category = category;
    if (listed !== undefined) query.listed = listed === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      'price-asc': { price: 1 },
      'price-desc': { price: -1 },
      popular: { views: -1 },
      'most-liked': { likeCount: -1 },
    };

    const sortOption = sortMap[sort] || { createdAt: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await NFT.countDocuments(query);

    const nfts = await NFT.find(query)
      .populate('creator', 'username avatar walletAddress isVerified')
      .populate('owner', 'username avatar walletAddress')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      nfts,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit), limit: Number(limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single NFT
// @route   GET /api/nfts/:id
export const getNFT = async (req, res) => {
  try {
    const nft = await NFT.findById(req.params.id)
      .populate('creator', 'username avatar walletAddress isVerified bio')
      .populate('owner', 'username avatar walletAddress')
      .populate('likes', 'username avatar');

    if (!nft) return res.status(404).json({ success: false, message: 'NFT not found' });

    // Increment views
    await NFT.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    res.json({ success: true, nft });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Like / unlike an NFT
// @route   POST /api/nfts/:id/like
export const toggleLike = async (req, res) => {
  try {
    const nft = await NFT.findById(req.params.id);
    if (!nft) return res.status(404).json({ success: false, message: 'NFT not found' });

    const liked = nft.likes.includes(req.user._id);
    if (liked) {
      nft.likes.pull(req.user._id);
    } else {
      nft.likes.push(req.user._id);
    }
    await nft.save();

    res.json({ success: true, liked: !liked, likeCount: nft.likes.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update NFT listing status
// @route   PUT /api/nfts/:id
export const updateNFT = async (req, res) => {
  try {
    const nft = await NFT.findById(req.params.id);
    if (!nft) return res.status(404).json({ success: false, message: 'NFT not found' });
    if (nft.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { listed, price, priceInEth, transactionHash, tokenId, sold } = req.body;
    if (listed !== undefined) nft.listed = listed;
    if (price !== undefined) nft.price = price;
    if (priceInEth !== undefined) nft.priceInEth = priceInEth;
    if (tokenId !== undefined) nft.tokenId = tokenId;
    if (transactionHash !== undefined) nft.transactionHash = transactionHash;
    if (sold !== undefined) nft.sold = sold;

    await nft.save();
    res.json({ success: true, nft });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get trending NFTs
// @route   GET /api/nfts/trending
export const getTrendingNFTs = async (req, res) => {
  try {
    const nfts = await NFT.find({ listed: true })
      .populate('creator', 'username avatar isVerified')
      .sort({ views: -1, createdAt: -1 })
      .limit(8);
    res.json({ success: true, nfts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get marketplace stats
// @route   GET /api/nfts/stats
export const getStats = async (req, res) => {
  try {
    const totalNFTs = await NFT.countDocuments();
    const totalListed = await NFT.countDocuments({ listed: true });
    const totalSold = await NFT.countDocuments({ sold: true });
    const totalUsers = await User.countDocuments();

    res.json({
      success: true,
      stats: { totalNFTs, totalListed, totalSold, totalUsers },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
