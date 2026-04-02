// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MemeVaultAuction — English-auction system for MemeVault NFTs
/// @notice Sellers create timed auctions; bidders compete; winner receives NFT.
///         Outbid funds accumulate in pendingReturns (pull-payment pattern).
///         Last-minute bids extend the auction by 10 minutes (anti-snipe).
contract MemeVaultAuction is ReentrancyGuard, Ownable {
    // ──────────────────────────────────────────────
    //  Structs & State
    // ──────────────────────────────────────────────

    struct Auction {
        uint256 auctionId;
        uint256 tokenId;
        address nftContract;
        address payable seller;
        uint256 startingPrice;
        uint256 reservePrice;   // 0 = no reserve
        uint256 highestBid;
        address payable highestBidder;
        uint256 startTime;
        uint256 endTime;
        bool ended;
        bool cancelled;
    }

    uint256 private _auctionIds;

    /// @dev auctionId => Auction
    mapping(uint256 => Auction) public auctions;

    /// @dev auctionId => bidder => refundable amount
    mapping(uint256 => mapping(address => uint256)) public pendingReturns;

    /// @notice Platform fee in basis points (default 2.5%)
    uint256 public platformFeeBps = 250;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    uint256 public minDuration = 1 hours;
    uint256 public maxDuration = 7 days;

    /// @notice Anti-snipe extension window
    uint256 public antiSnipeWindow = 10 minutes;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event AuctionCreated(
        uint256 indexed auctionId,
        uint256 indexed tokenId,
        address indexed nftContract,
        address seller,
        uint256 startingPrice,
        uint256 reservePrice,
        uint256 startTime,
        uint256 endTime
    );

    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        uint256 newEndTime
    );

    event AuctionEnded(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 amount
    );

    event AuctionCancelled(
        uint256 indexed auctionId,
        address indexed seller
    );

    event Withdrawal(address indexed user, uint256 amount);

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ──────────────────────────────────────────────
    //  Seller Functions
    // ──────────────────────────────────────────────

    /// @notice Create a new English auction for an NFT you own
    /// @param nftContract Address of the ERC-721 contract
    /// @param tokenId     Token to auction
    /// @param startingPrice Minimum opening bid (wei)
    /// @param reservePrice  Hidden reserve — 0 to disable (wei)
    /// @param duration      Auction length in seconds
    /// @return auctionId   Unique auction identifier
    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 startingPrice,
        uint256 reservePrice,
        uint256 duration
    ) external returns (uint256 auctionId) {
        require(
            duration >= minDuration && duration <= maxDuration,
            "MemeVaultAuction: invalid duration"
        );
        require(startingPrice > 0, "MemeVaultAuction: starting price must be > 0");
        require(
            reservePrice == 0 || reservePrice >= startingPrice,
            "MemeVaultAuction: reserve must be >= starting price"
        );

        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        _auctionIds++;
        auctionId = _auctionIds;

        uint256 start = block.timestamp;
        uint256 end   = start + duration;

        auctions[auctionId] = Auction({
            auctionId:     auctionId,
            tokenId:       tokenId,
            nftContract:   nftContract,
            seller:        payable(msg.sender),
            startingPrice: startingPrice,
            reservePrice:  reservePrice,
            highestBid:    0,
            highestBidder: payable(address(0)),
            startTime:     start,
            endTime:       end,
            ended:         false,
            cancelled:     false
        });

        emit AuctionCreated(
            auctionId, tokenId, nftContract, msg.sender,
            startingPrice, reservePrice, start, end
        );
    }

    /// @notice Cancel an auction with no bids (returns NFT to seller)
    /// @param auctionId Auction to cancel
    function cancelAuction(uint256 auctionId) external nonReentrant {
        Auction storage a = auctions[auctionId];

        require(msg.sender == a.seller, "MemeVaultAuction: not the seller");
        require(!a.ended,     "MemeVaultAuction: auction already ended");
        require(!a.cancelled, "MemeVaultAuction: already cancelled");
        require(a.highestBid == 0, "MemeVaultAuction: cannot cancel with active bids");

        a.cancelled = true;

        IERC721(a.nftContract).transferFrom(address(this), a.seller, a.tokenId);

        emit AuctionCancelled(auctionId, msg.sender);
    }

    // ──────────────────────────────────────────────
    //  Bidder Functions
    // ──────────────────────────────────────────────

    /// @notice Place a bid on an active auction
    /// @param auctionId Target auction
    function placeBid(uint256 auctionId) external payable nonReentrant {
        Auction storage a = auctions[auctionId];

        require(block.timestamp >= a.startTime, "MemeVaultAuction: not started");
        require(block.timestamp <  a.endTime,   "MemeVaultAuction: auction ended");
        require(!a.cancelled,  "MemeVaultAuction: auction cancelled");
        require(!a.ended,      "MemeVaultAuction: auction finalized");
        require(msg.sender != a.seller, "MemeVaultAuction: seller cannot bid");

        uint256 minBid = a.highestBid == 0
            ? a.startingPrice
            : a.highestBid + 1 wei;

        require(msg.value >= minBid, "MemeVaultAuction: bid too low");

        // Credit previous highest bidder for refund
        if (a.highestBidder != address(0)) {
            pendingReturns[auctionId][a.highestBidder] += a.highestBid;
        }

        a.highestBid    = msg.value;
        a.highestBidder = payable(msg.sender);

        // Anti-snipe: extend if bid lands in last window
        if (a.endTime - block.timestamp < antiSnipeWindow) {
            a.endTime += antiSnipeWindow;
        }

        emit BidPlaced(auctionId, msg.sender, msg.value, a.endTime);
    }

    /// @notice Withdraw refunded bid amounts (pull-payment)
    /// @param auctionId Auction to withdraw from
    function withdrawBid(uint256 auctionId) external nonReentrant {
        uint256 amount = pendingReturns[auctionId][msg.sender];
        require(amount > 0, "MemeVaultAuction: nothing to withdraw");

        pendingReturns[auctionId][msg.sender] = 0;
        payable(msg.sender).transfer(amount);

        emit Withdrawal(msg.sender, amount);
    }

    // ──────────────────────────────────────────────
    //  Settlement
    // ──────────────────────────────────────────────

    /// @notice Finalise an auction once its time has passed
    /// @dev Anyone may call this to settle the auction
    /// @param auctionId Auction to settle
    function endAuction(uint256 auctionId) external nonReentrant {
        Auction storage a = auctions[auctionId];

        require(block.timestamp >= a.endTime, "MemeVaultAuction: not yet ended");
        require(!a.ended,     "MemeVaultAuction: already ended");
        require(!a.cancelled, "MemeVaultAuction: is cancelled");

        a.ended = true;

        if (a.highestBidder != address(0) &&
            (a.reservePrice == 0 || a.highestBid >= a.reservePrice)) {
            // Transfer NFT to winner
            IERC721(a.nftContract).transferFrom(
                address(this), a.highestBidder, a.tokenId
            );

            // Distribute proceeds
            uint256 fee     = (a.highestBid * platformFeeBps) / BPS_DENOMINATOR;
            uint256 payout  = a.highestBid - fee;

            a.seller.transfer(payout);
            payable(owner()).transfer(fee);

            emit AuctionEnded(auctionId, a.highestBidder, a.highestBid);
        } else {
            // Reserve not met — return NFT to seller, refund highest bidder
            IERC721(a.nftContract).transferFrom(address(this), a.seller, a.tokenId);

            if (a.highestBidder != address(0)) {
                pendingReturns[auctionId][a.highestBidder] += a.highestBid;
            }

            emit AuctionEnded(auctionId, address(0), 0);
        }
    }

    // ──────────────────────────────────────────────
    //  Admin
    // ──────────────────────────────────────────────

    /// @notice Update platform fee (max 10%)
    function updatePlatformFee(uint256 _bps) external onlyOwner {
        require(_bps <= 1000, "MemeVaultAuction: fee > 10%");
        platformFeeBps = _bps;
    }

    /// @notice Update auction duration bounds
    function updateDurationBounds(
        uint256 _minDuration,
        uint256 _maxDuration
    ) external onlyOwner {
        require(_minDuration < _maxDuration, "MemeVaultAuction: invalid bounds");
        minDuration = _minDuration;
        maxDuration = _maxDuration;
    }

    /// @notice Update anti-snipe window
    function updateAntiSnipeWindow(uint256 _window) external onlyOwner {
        antiSnipeWindow = _window;
    }

    // ──────────────────────────────────────────────
    //  Views
    // ──────────────────────────────────────────────

    /// @notice Return full auction details
    function getAuction(
        uint256 auctionId
    ) external view returns (Auction memory) {
        return auctions[auctionId];
    }

    /// @notice Return total auctions created
    function getTotalAuctions() external view returns (uint256) {
        return _auctionIds;
    }

    /// @notice Return time remaining in seconds (0 if ended)
    function timeRemaining(uint256 auctionId) external view returns (uint256) {
        Auction storage a = auctions[auctionId];
        if (block.timestamp >= a.endTime) return 0;
        return a.endTime - block.timestamp;
    }

    /// @notice Check refundable amount for a bidder
    function getPendingReturn(
        uint256 auctionId,
        address bidder
    ) external view returns (uint256) {
        return pendingReturns[auctionId][bidder];
    }
}
