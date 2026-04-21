import User from '../models/User.model.js';
import NFT from '../models/NFT.model.js';

// @desc    Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({
      $or: [{ username: req.params.identifier }, { walletAddress: req.params.identifier.toLowerCase() }],
    })
      .populate('followers', 'username avatar')
      .populate('following', 'username avatar');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const createdNFTs = await NFT.find({ creator: user._id }).select('name image price listed').limit(12);
    const ownedNFTs = await NFT.find({ owner: user._id }).select('name image price listed').limit(12);

    res.json({ success: true, user, createdNFTs, ownedNFTs });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update profile
export const updateProfile = async (req, res) => {
  try {
    const { username, bio, avatar, coverImage } = req.body;

    if (username && username !== req.user.username) {
      const exists = await User.findOne({ username });
      if (exists) return res.status(400).json({ success: false, message: 'Username already taken' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { username: username || req.user.username, bio, avatar, coverImage },
      { new: true, runValidators: true }
    );

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Follow/unfollow user
export const toggleFollow = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    const isFollowing = targetUser.followers.includes(req.user._id);
    if (isFollowing) {
      targetUser.followers.pull(req.user._id);
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: req.params.id } });
    } else {
      targetUser.followers.push(req.user._id);
      await User.findByIdAndUpdate(req.user._id, { $push: { following: req.params.id } });
    }
    await targetUser.save();

    res.json({ success: true, following: !isFollowing, followerCount: targetUser.followers.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get top creators
export const getTopCreators = async (req, res) => {
  try {
    const creators = await User.find()
      .sort({ nftsCreated: -1, totalEarnings: -1 })
      .limit(10)
      .select('username avatar bio isVerified nftsCreated totalEarnings walletAddress');
    res.json({ success: true, creators });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user's NFTs
export const getUserNFTs = async (req, res) => {
  try {
    const { type = 'owned' } = req.query;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const query = type === 'created' ? { creator: user._id } : { owner: user._id };
    const nfts = await NFT.find(query)
      .populate('creator', 'username avatar')
      .populate('owner', 'username avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, nfts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all users (People/Discover page)
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('username avatar bio isVerified nftsCreated totalEarnings followers walletAddress')
      .sort({ nftsCreated: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    res.json({ success: true, users, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
