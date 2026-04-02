import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
  {
    offerId: {
      type: Number,
      unique: true,
      sparse: true,
    },
    nft: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NFT',
      required: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    buyerAddress: {
      type: String,
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    sellerAddress: String,
    amount: {
      type: Number,
      required: true,
    },
    amountEth: String,
    expirationTime: {
      type: Date,
      required: true,
    },
    duration: Number, // seconds
    status: {
      type: String,
      enum: ['active', 'accepted', 'cancelled', 'expired'],
      default: 'active',
    },
    accepted: {
      type: Boolean,
      default: false,
    },
    cancelled: {
      type: Boolean,
      default: false,
    },
    nftContractAddress: String,
    tokenId: Number,
    transactionHash: String,
  },
  { timestamps: true }
);

offerSchema.virtual('isValid').get(function () {
  return !this.accepted && !this.cancelled && new Date() <= this.expirationTime;
});

offerSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Offer', offerSchema);
