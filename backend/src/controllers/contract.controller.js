// Contract ABI information endpoint for frontend use
export const getContractInfo = async (req, res) => {
  try {
    res.json({
      success: true,
      contracts: {
        memeVault: {
          address: process.env.MEMEVAULT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
          name: 'MemeVault',
          symbol: 'MEME',
        },
        memeVaultAuction: {
          address: process.env.MEMEVAULT_AUCTION_ADDRESS || '0x0000000000000000000000000000000000000000',
        },
        memeVaultOffers: {
          address: process.env.MEMEVAULT_OFFERS_ADDRESS || '0x0000000000000000000000000000000000000000',
        },
      },
      rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:8545',
      chainId: process.env.CHAIN_ID || '31337',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
