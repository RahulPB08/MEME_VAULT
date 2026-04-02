// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console}    from "forge-std/Test.sol";
import {MemeVault}        from "../src/MemeVault.sol";
import {MemeVaultAuction} from "../src/MemeVaultAuction.sol";
import {MemeVaultOffers}  from "../src/MemeVaultOffers.sol";

// ────────────────────────────────────────────────────────────────────
//  MemeVault (NFT + Marketplace) Tests
// ────────────────────────────────────────────────────────────────────

contract MemeVaultTest is Test {
    MemeVault public vault;

    address public owner   = address(this);
    address public seller  = makeAddr("seller");
    address public buyer   = makeAddr("buyer");

    uint256 public listingPrice;
    string  public constant MEME_URI   = "ipfs://QmMemeHash123";
    uint256 public constant SELL_PRICE = 1 ether;

    // ── Setup ──────────────────────────────────────

    function setUp() public {
        vault        = new MemeVault();
        listingPrice = vault.getListingPrice();

        // Fund test accounts
        vm.deal(seller, 10 ether);
        vm.deal(buyer,  10 ether);
    }

    // ── helpers ────────────────────────────────────

    /// @dev Mints a token as `seller` and returns the tokenId
    function _mintAsSellerAndList() internal returns (uint256 tokenId) {
        vm.prank(seller);
        tokenId = vault.createToken{value: listingPrice}(MEME_URI, SELL_PRICE);
    }

    // ── Listing Price ──────────────────────────────

    function test_getListingPrice() public view {
        assertEq(vault.getListingPrice(), 0.0015 ether);
    }

    function test_updateListingPrice_onlyOwner() public {
        vault.updateListingPrice(0.003 ether);
        assertEq(vault.getListingPrice(), 0.003 ether);
    }

    function test_updateListingPrice_revertIfNotOwner() public {
        vm.prank(seller);
        vm.expectRevert();
        vault.updateListingPrice(0.003 ether);
    }

    // ── Minting ────────────────────────────────────

    function test_createToken_success() public {
        uint256 tokenId = _mintAsSellerAndList();
        assertEq(tokenId, 1);
        assertEq(vault.getTotalMemes(), 1);
    }

    function test_createToken_wrongFee_reverts() public {
        vm.prank(seller);
        vm.expectRevert("MemeVault: incorrect listing fee");
        vault.createToken{value: 0.001 ether}(MEME_URI, SELL_PRICE);
    }

    function test_createToken_zeroPriceReverts() public {
        vm.prank(seller);
        vm.expectRevert("MemeVault: price must be > 0");
        vault.createToken{value: listingPrice}(MEME_URI, 0);
    }

    function test_createToken_contractOwnsToken() public {
        uint256 tokenId = _mintAsSellerAndList();
        assertEq(vault.ownerOf(tokenId), address(vault));
    }

    // ── Queries ────────────────────────────────────

    function test_fetchMarketItems_returnsUnsold() public {
        _mintAsSellerAndList();
        MemeVault.MarketItem[] memory items = vault.fetchMarketItems();
        assertEq(items.length, 1);
        assertEq(items[0].price, SELL_PRICE);
        assertFalse(items[0].sold);
        assertTrue(items[0].active);
    }

    function test_fetchItemsListed() public {
        _mintAsSellerAndList();
        vm.prank(seller);
        MemeVault.MarketItem[] memory listed = vault.fetchItemsListed();
        assertEq(listed.length, 1);
    }

    // ── Purchase ───────────────────────────────────

    function test_createMarketSale_success() public {
        uint256 tokenId         = _mintAsSellerAndList();
        uint256 sellerBalBefore = seller.balance;

        vm.prank(buyer);
        vault.createMarketSale{value: SELL_PRICE}(tokenId);

        assertEq(vault.ownerOf(tokenId), buyer);
        assertEq(vault.getTotalSold(), 1);

        // Seller receives price minus listing fee
        assertEq(seller.balance, sellerBalBefore + SELL_PRICE - listingPrice);
    }

    function test_createMarketSale_wrongPriceReverts() public {
        uint256 tokenId = _mintAsSellerAndList();

        vm.prank(buyer);
        vm.expectRevert("MemeVault: incorrect purchase price");
        vault.createMarketSale{value: 0.5 ether}(tokenId);
    }

    function test_createMarketSale_alreadySoldReverts() public {
        uint256 tokenId = _mintAsSellerAndList();

        vm.prank(buyer);
        vault.createMarketSale{value: SELL_PRICE}(tokenId);

        vm.prank(makeAddr("buyer2"));
        vm.expectRevert("MemeVault: item already sold");
        vault.createMarketSale{value: SELL_PRICE}(tokenId);
    }

    // ── Cancel ─────────────────────────────────────

    function test_cancelMarketItem_success() public {
        uint256 tokenId = _mintAsSellerAndList();

        vm.prank(seller);
        vault.cancelMarketItem(tokenId);

        assertEq(vault.ownerOf(tokenId), seller);

        MemeVault.MarketItem memory item = vault.getMarketItem(tokenId);
        assertFalse(item.active);
    }

    function test_cancelMarketItem_notSellerReverts() public {
        uint256 tokenId = _mintAsSellerAndList();

        vm.prank(buyer);
        vm.expectRevert("MemeVault: only seller can cancel");
        vault.cancelMarketItem(tokenId);
    }

    // ── Resell ─────────────────────────────────────

    function test_resellToken_success() public {
        uint256 tokenId = _mintAsSellerAndList();

        vm.prank(buyer);
        vault.createMarketSale{value: SELL_PRICE}(tokenId);

        vm.prank(buyer);
        vault.resellToken{value: listingPrice}(tokenId, 2 ether);

        MemeVault.MarketItem memory item = vault.getMarketItem(tokenId);
        assertEq(item.price, 2 ether);
        assertTrue(item.active);
        assertFalse(item.sold);
    }

    // ── Withdraw ───────────────────────────────────

    function test_withdrawFees_onlyOwner() public {
        _mintAsSellerAndList();

        // listingPrice is in contract now
        uint256 ownerBalBefore = owner.balance;
        vault.withdrawFees();
        assertGt(owner.balance, ownerBalBefore);
    }
}

// ────────────────────────────────────────────────────────────────────
//  MemeVaultAuction Tests
// ────────────────────────────────────────────────────────────────────

contract MemeVaultAuctionTest is Test {
    MemeVault        public vault;
    MemeVaultAuction public auctions;

    address public auctionOwner = address(this);
    address public seller       = makeAddr("seller");
    address public bidder1      = makeAddr("bidder1");
    address public bidder2      = makeAddr("bidder2");

    uint256 public listingPrice;
    uint256 public tokenId;

    uint256 constant START_PRICE   = 0.1 ether;
    uint256 constant DURATION      = 1 days;
    string  constant MEME_URI      = "ipfs://QmAuctionMeme";

    function setUp() public {
        vault      = new MemeVault();
        auctions   = new MemeVaultAuction();
        listingPrice = vault.getListingPrice();

        vm.deal(seller,  10 ether);
        vm.deal(bidder1, 10 ether);
        vm.deal(bidder2, 10 ether);

        // Mint an NFT for the seller and retrieve it (cancel listing)
        vm.prank(seller);
        tokenId = vault.createToken{value: listingPrice}(MEME_URI, 1 ether);

        // seller buys back their own token to own it (or we cancel listing)
        vm.prank(seller);
        vault.cancelMarketItem(tokenId);

        // seller approves auction contract
        vm.prank(seller);
        vault.approve(address(auctions), tokenId);
    }

    function _createAuction() internal returns (uint256 auctionId) {
        vm.prank(seller);
        auctionId = auctions.createAuction(
            address(vault), tokenId, START_PRICE, 0, DURATION
        );
    }

    function test_createAuction_success() public {
        uint256 auctionId = _createAuction();
        assertEq(auctionId, 1);

        MemeVaultAuction.Auction memory a = auctions.getAuction(auctionId);
        assertEq(a.seller,        seller);
        assertEq(a.startingPrice, START_PRICE);
        assertFalse(a.ended);
    }

    function test_placeBid_success() public {
        uint256 auctionId = _createAuction();

        vm.prank(bidder1);
        auctions.placeBid{value: START_PRICE}(auctionId);

        MemeVaultAuction.Auction memory a = auctions.getAuction(auctionId);
        assertEq(a.highestBid,    START_PRICE);
        assertEq(a.highestBidder, bidder1);
    }

    function test_placeBid_tooLowReverts() public {
        uint256 auctionId = _createAuction();

        vm.prank(bidder1);
        vm.expectRevert("MemeVaultAuction: bid too low");
        auctions.placeBid{value: START_PRICE - 1}(auctionId);
    }

    function test_outbid_accumulatesRefund() public {
        uint256 auctionId = _createAuction();

        vm.prank(bidder1);
        auctions.placeBid{value: START_PRICE}(auctionId);

        vm.prank(bidder2);
        auctions.placeBid{value: START_PRICE + 0.1 ether}(auctionId);

        uint256 refund = auctions.getPendingReturn(auctionId, bidder1);
        assertEq(refund, START_PRICE);
    }

    function test_endAuction_transfersNFT() public {
        uint256 auctionId = _createAuction();

        vm.prank(bidder1);
        auctions.placeBid{value: START_PRICE}(auctionId);

        vm.warp(block.timestamp + DURATION + 1);

        auctions.endAuction(auctionId);

        assertEq(vault.ownerOf(tokenId), bidder1);
    }

    function test_cancelAuction_noBids() public {
        uint256 auctionId = _createAuction();

        vm.prank(seller);
        auctions.cancelAuction(auctionId);

        assertEq(vault.ownerOf(tokenId), seller);
    }

    function test_cancelAuction_withBidReverts() public {
        uint256 auctionId = _createAuction();

        vm.prank(bidder1);
        auctions.placeBid{value: START_PRICE}(auctionId);

        vm.prank(seller);
        vm.expectRevert("MemeVaultAuction: cannot cancel with active bids");
        auctions.cancelAuction(auctionId);
    }
}

// ────────────────────────────────────────────────────────────────────
//  MemeVaultOffers Tests
// ────────────────────────────────────────────────────────────────────

contract MemeVaultOffersTest is Test {
    MemeVault       public vault;
    MemeVaultOffers public offersContract;

    address public nftOwner = makeAddr("nftOwner");
    address public offeror  = makeAddr("offeror");

    uint256 public listingPrice;
    uint256 public tokenId;

    string  constant MEME_URI = "ipfs://QmOfferMeme";
    uint256 constant OFFER    = 0.5 ether;
    uint256 constant DURATION = 1 days;

    function setUp() public {
        vault          = new MemeVault();
        offersContract = new MemeVaultOffers();
        listingPrice   = vault.getListingPrice();

        vm.deal(nftOwner, 10 ether);
        vm.deal(offeror,  10 ether);

        // Mint and cancel listing so nftOwner holds the token
        vm.prank(nftOwner);
        tokenId = vault.createToken{value: listingPrice}(MEME_URI, 1 ether);

        vm.prank(nftOwner);
        vault.cancelMarketItem(tokenId);
    }

    function test_makeOffer_success() public {
        vm.prank(offeror);
        uint256 offerId = offersContract.makeOffer{value: OFFER}(
            address(vault), tokenId, DURATION
        );

        assertEq(offerId, 1);

        MemeVaultOffers.Offer memory o = offersContract.getOffer(1);
        assertEq(o.amount, OFFER);
        assertEq(o.buyer,  offeror);
        assertFalse(o.accepted);
        assertFalse(o.cancelled);
    }

    function test_acceptOffer_success() public {
        // Make offer
        vm.prank(offeror);
        uint256 offerId = offersContract.makeOffer{value: OFFER}(
            address(vault), tokenId, DURATION
        );

        // nftOwner approves offers contract
        vm.prank(nftOwner);
        vault.approve(address(offersContract), tokenId);

        uint256 ownerBalBefore = nftOwner.balance;

        // Accept
        vm.prank(nftOwner);
        offersContract.acceptOffer(offerId);

        assertEq(vault.ownerOf(tokenId), offeror);
        assertEq(nftOwner.balance, ownerBalBefore + OFFER);
    }

    function test_cancelOffer_success() public {
        vm.prank(offeror);
        uint256 offerId = offersContract.makeOffer{value: OFFER}(
            address(vault), tokenId, DURATION
        );

        uint256 offerorBalBefore = offeror.balance;

        vm.prank(offeror);
        offersContract.cancelOffer(offerId);

        MemeVaultOffers.Offer memory o = offersContract.getOffer(offerId);
        assertTrue(o.cancelled);
        assertApproxEqAbs(offeror.balance, offerorBalBefore + OFFER, 1e15);
    }

    function test_acceptExpiredOfferReverts() public {
        vm.prank(offeror);
        uint256 offerId = offersContract.makeOffer{value: OFFER}(
            address(vault), tokenId, DURATION
        );

        vm.warp(block.timestamp + DURATION + 1);

        vm.prank(nftOwner);
        vault.approve(address(offersContract), tokenId);

        vm.prank(nftOwner);
        vm.expectRevert("MemeVaultOffers: offer expired");
        offersContract.acceptOffer(offerId);
    }

    function test_increaseOffer() public {
        vm.prank(offeror);
        uint256 offerId = offersContract.makeOffer{value: OFFER}(
            address(vault), tokenId, DURATION
        );

        vm.prank(offeror);
        offersContract.increaseOffer{value: 0.2 ether}(offerId);

        MemeVaultOffers.Offer memory o = offersContract.getOffer(offerId);
        assertEq(o.amount, OFFER + 0.2 ether);
    }
}
