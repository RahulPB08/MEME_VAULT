import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

const Web3Context = createContext(null);

// ABIs (minimal — add full ABI from compiled contracts)
const MEMEVAULT_ABI = [
  "function createToken(string memory tokenURI, uint256 price) external payable returns (uint256)",
  "function resellToken(uint256 tokenId, uint256 price) external payable",
  "function createMarketSale(uint256 tokenId) external payable",
  "function cancelMarketItem(uint256 tokenId) external",
  "function getMarketItem(uint256 tokenId) external view returns (tuple(uint256 tokenId, address seller, address owner, uint256 price, bool sold, bool active))",
  "function fetchMarketItems() external view returns (tuple(uint256 tokenId, address seller, address owner, uint256 price, bool sold, bool active)[])",
  "function fetchMyNFTs() external view returns (tuple(uint256 tokenId, address seller, address owner, uint256 price, bool sold, bool active)[])",
  "function fetchItemsListed() external view returns (tuple(uint256 tokenId, address seller, address owner, uint256 price, bool sold, bool active)[])",
  "function getListingPrice() external view returns (uint256)",
  "function getTotalMemes() external view returns (uint256)",
  "function getTotalSold() external view returns (uint256)",
  "event MarketItemCreated(uint256 indexed tokenId, address indexed seller, address owner, uint256 price, bool sold)",
  "event MarketItemSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price)",
];

const AUCTION_ABI = [
  "function createAuction(address nftContract, uint256 tokenId, uint256 startingPrice, uint256 reservePrice, uint256 duration) external returns (uint256)",
  "function placeBid(uint256 auctionId) external payable",
  "function endAuction(uint256 auctionId) external",
  "function cancelAuction(uint256 auctionId) external",
  "function getAuction(uint256 auctionId) external view returns (tuple(uint256 auctionId, uint256 tokenId, address nftContract, address seller, uint256 startingPrice, uint256 reservePrice, uint256 highestBid, address highestBidder, uint256 startTime, uint256 endTime, bool ended, bool cancelled))",
  "function getTotalAuctions() external view returns (uint256)",
  "function timeRemaining(uint256 auctionId) external view returns (uint256)",
  "event AuctionCreated(uint256 indexed auctionId, uint256 indexed tokenId, address indexed nftContract, address seller, uint256 startingPrice, uint256 reservePrice, uint256 startTime, uint256 endTime)",
  "event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount, uint256 newEndTime)",
  "event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount)",
];

const OFFERS_ABI = [
  "function makeOffer(address nftContract, uint256 tokenId, uint256 duration) external payable returns (uint256)",
  "function increaseOffer(uint256 offerId) external payable",
  "function cancelOffer(uint256 offerId) external",
  "function acceptOffer(uint256 offerId) external",
  "function getOffer(uint256 offerId) external view returns (tuple(uint256 offerId, address nftContract, uint256 tokenId, address buyer, uint256 amount, uint256 expirationTime, bool accepted, bool cancelled))",
  "function isOfferValid(uint256 offerId) external view returns (bool)",
  "event OfferMade(uint256 indexed offerId, address indexed nftContract, uint256 indexed tokenId, address buyer, uint256 amount, uint256 expirationTime)",
];

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [contracts, setContracts] = useState({});

  const CONTRACT_ADDRESSES = {
    memeVault: import.meta.env.VITE_MEMEVAULT_ADDRESS || '0x0000000000000000000000000000000000000000',
    auction: import.meta.env.VITE_AUCTION_ADDRESS || '0x0000000000000000000000000000000000000000',
    offers: import.meta.env.VITE_OFFERS_ADDRESS || '0x0000000000000000000000000000000000000000',
  };

  const setupContracts = useCallback((signerOrProvider) => {
    try {
      const memeVault = new ethers.Contract(CONTRACT_ADDRESSES.memeVault, MEMEVAULT_ABI, signerOrProvider);
      const auction = new ethers.Contract(CONTRACT_ADDRESSES.auction, AUCTION_ABI, signerOrProvider);
      const offers = new ethers.Contract(CONTRACT_ADDRESSES.offers, OFFERS_ABI, signerOrProvider);
      setContracts({ memeVault, auction, offers });
    } catch (e) {
      console.warn('Contract setup failed (addresses not configured):', e.message);
    }
  }, []);

  const REQUIRED_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 31337);
  const CHAIN_HEX = '0x' + REQUIRED_CHAIN_ID.toString(16);

  // Auto-switch MetaMask to the Anvil local network
  const switchToAnvil = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN_HEX }],
      });
    } catch (switchErr) {
      // Chain not added yet — add it automatically
      if (switchErr.code === 4902 || switchErr.code === -32603) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: CHAIN_HEX,
            chainName: 'Anvil Local (MemeVault)',
            nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['http://127.0.0.1:8545'],
          }],
        });
      } else {
        throw switchErr;
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error('MetaMask not found! Please install MetaMask.');
      return null;
    }
    setIsConnecting(true);
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Auto-switch to Anvil before reading the network
      const currentChain = await window.ethereum.request({ method: 'eth_chainId' });
      if (Number(currentChain) !== REQUIRED_CHAIN_ID) {
        toast.loading('Switching to Anvil local network…', { id: 'switch-net' });
        await switchToAnvil();
        toast.dismiss('switch-net');
        toast.success('Switched to Anvil local network ✅');
      }

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();
      const address = await web3Signer.getAddress();
      const network = await web3Provider.getNetwork();
      const cid = Number(network.chainId);

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAccount(address);
      setChainId(cid);
      setupContracts(web3Signer);

      if (cid !== REQUIRED_CHAIN_ID) {
        // Still wrong — user rejected the switch
        toast.error(`⚠️ Still on wrong network (ID ${cid}). Please switch to Anvil (${REQUIRED_CHAIN_ID}) manually.`, { duration: 8000 });
      } else {
        toast.success(`Connected: ${address.slice(0, 6)}...${address.slice(-4)} ✅`);
      }
      return address;
    } catch (error) {
      toast.error(error.message || 'Failed to connect wallet');
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
    setContracts({});
    toast.success('Wallet disconnected');
  };

  // Default listing fee: 0.0015 ETH (matches MemeVault.sol constructor)
  const DEFAULT_LISTING_FEE = ethers.parseEther('0.0015').toString();

  const getListingPrice = async () => {
    if (!contracts.memeVault) return DEFAULT_LISTING_FEE;
    try {
      const price = await contracts.memeVault.getListingPrice();
      return price.toString();
    } catch (e) {
      console.warn('getListingPrice() failed — using default 0.0015 ETH. Is MetaMask on the correct network?', e.message);
      return DEFAULT_LISTING_FEE;
    }
  };

  const mintNFT = async (tokenURI, priceInWei) => {
    if (!contracts.memeVault || !signer) throw new Error('Wallet not connected');
    if (!chainId) throw new Error('Wallet not connected');
    const REQUIRED = Number(import.meta.env.VITE_CHAIN_ID || 31337);
    if (chainId !== REQUIRED) {
      throw new Error(`Wrong network! Switch MetaMask to Chain ID ${REQUIRED} (Anvil local)\nRPC: http://127.0.0.1:8545`);
    }
    const listingFee = await getListingPrice();
    const tx = await contracts.memeVault.createToken(tokenURI, priceInWei, { value: listingFee });
    const receipt = await tx.wait();
    return receipt;
  };

  const buyNFT = async (tokenId, priceInWei) => {
    if (!contracts.memeVault || !signer) throw new Error('Wallet not connected');
    const tx = await contracts.memeVault.createMarketSale(tokenId, { value: BigInt(priceInWei) });
    const receipt = await tx.wait();
    return receipt;
  };

  const resellNFT = async (tokenId, newPriceInWei) => {
    if (!contracts.memeVault || !signer) throw new Error('Wallet not connected');
    const listingFee = await getListingPrice();
    const tx = await contracts.memeVault.resellToken(tokenId, BigInt(newPriceInWei), { value: listingFee });
    const receipt = await tx.wait();
    return receipt;
  };

  const cancelListing = async (tokenId) => {
    if (!contracts.memeVault || !signer) throw new Error('Wallet not connected');
    const tx = await contracts.memeVault.cancelMarketItem(tokenId);
    return tx.wait();
  };

  const createAuction = async (nftContractAddress, tokenId, startingPrice, reservePrice, duration) => {
    if (!contracts.auction || !contracts.memeVault || !signer) throw new Error('Wallet not connected');

    // Step 1: Check if the NFT is currently held by the MemeVault marketplace contract.
    // If so, we must cancel the listing first to return the NFT to the user's wallet
    // before the auction contract can accept a transferFrom().
    try {
      const marketItem = await contracts.memeVault.getMarketItem(tokenId);
      const isInMarket = marketItem.active && !marketItem.cancelled;
      if (isInMarket) {
        const cancelTx = await contracts.memeVault.cancelMarketItem(tokenId);
        await cancelTx.wait();
      }
    } catch (e) {
      console.warn('Could not check/cancel market item, proceeding anyway...', e.message);
    }

    // Step 2: Approve the Auction contract to transfer this token from the user
    const nftContractInstance = new ethers.Contract(
      nftContractAddress,
      [
        "function approve(address to, uint256 tokenId)",
        "function getApproved(uint256 tokenId) view returns (address)"
      ],
      signer
    );

    const currentApproval = await nftContractInstance.getApproved(tokenId);
    if (currentApproval.toLowerCase() !== CONTRACT_ADDRESSES.auction.toLowerCase()) {
      const approveTx = await nftContractInstance.approve(CONTRACT_ADDRESSES.auction, tokenId);
      await approveTx.wait();
    }

    // Step 3: Create the auction
    const tx = await contracts.auction.createAuction(nftContractAddress, tokenId, startingPrice, reservePrice, duration);
    return tx.wait();
  };

  const placeBid = async (auctionId, bidAmountInWei) => {
    if (!contracts.auction || !signer) throw new Error('Wallet not connected');
    const tx = await contracts.auction.placeBid(auctionId, { value: BigInt(bidAmountInWei) });
    return tx.wait();
  };

  const makeOffer = async (nftContract, tokenId, duration, amountInWei) => {
    if (!contracts.offers || !signer) throw new Error('Wallet not connected');
    const tx = await contracts.offers.makeOffer(nftContract, tokenId, duration, { value: BigInt(amountInWei) });
    return tx.wait();
  };

  const acceptOffer = async (offerId) => {
    if (!contracts.offers || !signer) throw new Error('Wallet not connected');
    const tx = await contracts.offers.acceptOffer(offerId);
    return tx.wait();
  };

  const formatEth = (wei) => {
    try {
      return ethers.formatEther(wei.toString());
    } catch { return '0'; }
  };

  const parseEth = (eth) => {
    try {
      return ethers.parseEther(eth.toString());
    } catch { return 0n; }
  };

  // Auto connect if already authorized
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
        if (accounts.length > 0) connectWallet();
      });
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) connectWallet();
        else disconnectWallet();
      });
      window.ethereum.on('chainChanged', () => connectWallet());
    }
    // eslint-disable-next-line
  }, []);

  return (
    <Web3Context.Provider
      value={{
        account, provider, signer, chainId,
        isConnecting, contracts, CONTRACT_ADDRESSES,
        connectWallet, disconnectWallet,
        switchToAnvil,
        mintNFT, buyNFT, resellNFT, cancelListing,
        createAuction, placeBid,
        makeOffer, acceptOffer,
        getListingPrice, formatEth, parseEth,
        isConnected: !!account,
        isWrongNetwork: !!account && chainId !== REQUIRED_CHAIN_ID,
        requiredChainId: REQUIRED_CHAIN_ID,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error('useWeb3 must be used inside Web3Provider');
  return ctx;
};
