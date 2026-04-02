// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MemeVaultOffers — Off-market offers on any ERC-721 NFT
/// @notice Any user can make a time-limited ETH offer on any NFT.
///         The NFT owner can accept; the offeror can cancel before acceptance.
///         Uses pull-payment pattern for safety on refunds.
contract MemeVaultOffers is ReentrancyGuard {
    // ──────────────────────────────────────────────
    //  Structs & State
    // ──────────────────────────────────────────────

    struct Offer {
        uint256 offerId;
        address nftContract;
        uint256 tokenId;
        address payable buyer;
        uint256 amount;
        uint256 expirationTime;
        bool accepted;
        bool cancelled;
    }

    uint256 private _offerIds;

    /// @dev offerId => Offer
    mapping(uint256 => Offer) public offers;

    /// @dev nftContract => tokenId => list of offer IDs
    mapping(address => mapping(uint256 => uint256[])) private _tokenOfferIds;

    uint256 public constant MIN_OFFER_DURATION = 1 hours;
    uint256 public constant MAX_OFFER_DURATION = 30 days;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event OfferMade(
        uint256 indexed offerId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address buyer,
        uint256 amount,
        uint256 expirationTime
    );

    event OfferAccepted(
        uint256 indexed offerId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address buyer,
        uint256 amount
    );

    event OfferCancelled(
        uint256 indexed offerId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address buyer
    );

    event OfferIncreased(
        uint256 indexed offerId,
        address indexed buyer,
        uint256 newAmount
    );

    // ──────────────────────────────────────────────
    //  Offeror Functions
    // ──────────────────────────────────────────────

    /// @notice Place an ETH offer on any ERC-721 token
    /// @param nftContract ERC-721 contract address
    /// @param tokenId     Token to bid on
    /// @param duration    Offer validity window in seconds
    /// @return offerId    Unique offer ID
    function makeOffer(
        address nftContract,
        uint256 tokenId,
        uint256 duration
    ) external payable returns (uint256 offerId) {
        require(msg.value > 0, "MemeVaultOffers: amount must be > 0");
        require(
            duration >= MIN_OFFER_DURATION && duration <= MAX_OFFER_DURATION,
            "MemeVaultOffers: invalid duration"
        );
        require(nftContract != address(0), "MemeVaultOffers: zero address");

        _offerIds++;
        offerId = _offerIds;

        uint256 expiry = block.timestamp + duration;

        offers[offerId] = Offer({
            offerId:        offerId,
            nftContract:    nftContract,
            tokenId:        tokenId,
            buyer:          payable(msg.sender),
            amount:         msg.value,
            expirationTime: expiry,
            accepted:       false,
            cancelled:      false
        });

        _tokenOfferIds[nftContract][tokenId].push(offerId);

        emit OfferMade(offerId, nftContract, tokenId, msg.sender, msg.value, expiry);
    }

    /// @notice Increase the value of an existing, non-expired offer
    /// @param offerId Offer to top up
    function increaseOffer(uint256 offerId) external payable nonReentrant {
        Offer storage offer = offers[offerId];

        require(offer.buyer == msg.sender,        "MemeVaultOffers: not your offer");
        require(!offer.accepted,                   "MemeVaultOffers: already accepted");
        require(!offer.cancelled,                  "MemeVaultOffers: already cancelled");
        require(block.timestamp < offer.expirationTime, "MemeVaultOffers: offer expired");
        require(msg.value > 0, "MemeVaultOffers: must send ETH");

        offer.amount += msg.value;

        emit OfferIncreased(offerId, msg.sender, offer.amount);
    }

    /// @notice Cancel an active offer and retrieve funds
    /// @param offerId Offer to cancel
    function cancelOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];

        require(offer.buyer == msg.sender, "MemeVaultOffers: not your offer");
        require(!offer.accepted,  "MemeVaultOffers: already accepted");
        require(!offer.cancelled, "MemeVaultOffers: already cancelled");

        uint256 refund = offer.amount;
        offer.cancelled = true;
        offer.amount = 0;

        payable(msg.sender).transfer(refund);

        emit OfferCancelled(
            offerId, offer.nftContract, offer.tokenId, msg.sender
        );
    }

    // ──────────────────────────────────────────────
    //  NFT Owner Functions
    // ──────────────────────────────────────────────

    /// @notice Accept an offer — transfers the NFT to buyer, ETH to caller
    /// @dev Caller must have approved this contract to transfer the token
    /// @param offerId Offer to accept
    function acceptOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];

        require(!offer.accepted,  "MemeVaultOffers: already accepted");
        require(!offer.cancelled, "MemeVaultOffers: cancelled");
        require(
            block.timestamp <= offer.expirationTime,
            "MemeVaultOffers: offer expired"
        );

        IERC721 nft = IERC721(offer.nftContract);
        require(
            nft.ownerOf(offer.tokenId) == msg.sender,
            "MemeVaultOffers: caller is not the token owner"
        );

        uint256 payout = offer.amount;
        offer.accepted = true;
        offer.amount   = 0;

        // Transfer NFT to buyer
        nft.transferFrom(msg.sender, offer.buyer, offer.tokenId);

        // Pay seller
        payable(msg.sender).transfer(payout);

        emit OfferAccepted(
            offerId,
            offer.nftContract,
            offer.tokenId,
            msg.sender,
            offer.buyer,
            payout
        );
    }

    // ──────────────────────────────────────────────
    //  Views
    // ──────────────────────────────────────────────

    /// @notice Retrieve a single offer by ID
    function getOffer(uint256 offerId) external view returns (Offer memory) {
        return offers[offerId];
    }

    /// @notice Returns all offer IDs for a given token
    function getTokenOfferIds(
        address nftContract,
        uint256 tokenId
    ) external view returns (uint256[] memory) {
        return _tokenOfferIds[nftContract][tokenId];
    }

    /// @notice Return all offers for a token (full structs)
    function getTokenOffers(
        address nftContract,
        uint256 tokenId
    ) external view returns (Offer[] memory) {
        uint256[] storage ids = _tokenOfferIds[nftContract][tokenId];
        Offer[] memory result = new Offer[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = offers[ids[i]];
        }
        return result;
    }

    /// @notice Check whether an offer is still valid (not expired, accepted, or cancelled)
    function isOfferValid(uint256 offerId) external view returns (bool) {
        Offer storage o = offers[offerId];
        return !o.accepted && !o.cancelled && block.timestamp <= o.expirationTime;
    }

    /// @notice Total number of offers ever created
    function getTotalOffers() external view returns (uint256) {
        return _offerIds;
    }
}
