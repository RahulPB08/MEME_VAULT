import jwt from 'jsonwebtoken';

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

export const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);
  const userData = {
    _id: user._id,
    username: user.username,
    email: user.email,
    walletAddress: user.walletAddress,
    avatar: user.avatar,
    bio: user.bio,
    isVerified: user.isVerified,
    role: user.role,
    nftsCreated: user.nftsCreated,
    totalEarnings: user.totalEarnings,
    followers: user.followers,
    following: user.following,
    createdAt: user.createdAt,
  };

  res.status(statusCode).json({
    success: true,
    token,
    user: userData,
  });
};
