import mongoose from 'mongoose';

const auctionSchema = new mongoose.Schema(
  {
    auctionId: {
      type: Number,
      unique: true,
      sparse: true,
    },
    nft: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NFT',
      required: true,
    },
    tokenId: {
      type: Number,
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sellerAddress: {
      type: String,
      required: true,
    },
    startingPrice: {
      type: Number,
      required: true,
    },
    startingPriceEth: String,
    reservePrice: {
      type: Number,
      default: 0,
    },
    highestBid: {
      type: Number,
      default: 0,
    },
    highestBidEth: {
      type: String,
      default: '0',
    },
    highestBidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    highestBidderAddress: {
      type: String,
      default: null,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number, // seconds
      required: true,
    },
    ended: {
      type: Boolean,
      default: false,
    },
    cancelled: {
      type: Boolean,
      default: false,
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    bids: [
      {
        bidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        bidderAddress: String,
        amount: Number,
        amountEth: String,
        txHash: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    nftContractAddress: String,
    transactionHash: String,
  },
  { timestamps: true }
);

auctionSchema.virtual('isActive').get(function () {
  return !this.ended && !this.cancelled && new Date() < this.endTime;
});

auctionSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Auction', auctionSchema);
