import mongoose from 'mongoose';

const nftSchema = new mongoose.Schema(
  {
    tokenId: {
      type: Number,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: [true, 'NFT name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    image: {
      type: String,
      required: [true, 'Image URL is required'],
    },
    ipfsHash: {
      type: String,
      default: '',
    },
    metadataUri: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['trending', 'classic', 'dank', 'wholesome', 'crypto', 'gaming', 'anime', 'politics', 'other'],
      default: 'other',
    },
    tags: [{ type: String, trim: true }],
    price: {
      type: Number,
      default: 0,
    },
    priceInEth: {
      type: String,
      default: '0',
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    creatorAddress: {
      type: String,
      default: '',
    },
    ownerAddress: {
      type: String,
      default: '',
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    views: {
      type: Number,
      default: 0,
    },
    listed: {
      type: Boolean,
      default: false,
    },
    sold: {
      type: Boolean,
      default: false,
    },
    onAuction: {
      type: Boolean,
      default: false,
    },
    auctionId: {
      type: Number,
      default: null,
    },
    transactionHash: {
      type: String,
      default: '',
    },
    blockchain: {
      type: String,
      default: 'Ethereum',
    },
    // History of sales/transfers
    history: [
      {
        event: { type: String, enum: ['mint', 'list', 'sale', 'transfer', 'delist', 'auction'] },
        from: String,
        to: String,
        price: Number,
        txHash: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    royaltyPercent: {
      type: Number,
      default: 10,
      min: 0,
      max: 50,
    },
  },
  { timestamps: true }
);

// Virtual for like count
nftSchema.virtual('likeCount').get(function () {
  return this.likes.length;
});

nftSchema.set('toJSON', { virtuals: true });
nftSchema.set('toObject', { virtuals: true });

// Indexes for fast queries
nftSchema.index({ listed: 1, sold: 1 });
nftSchema.index({ creator: 1 });
nftSchema.index({ owner: 1 });
nftSchema.index({ category: 1 });
nftSchema.index({ tags: 1 });
nftSchema.index({ price: 1 });

export default mongoose.model('NFT', nftSchema);
