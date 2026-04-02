// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MemeVault — NFT Meme Marketplace
/// @notice Mint, list, buy, resell, and cancel meme NFTs on-chain
/// @dev Combines ERC-721 minting with an on-chain marketplace
contract MemeVault is ERC721URIStorage, ReentrancyGuard, Ownable {
    // ──────────────────────────────────────────────
    //  State Variables
    // ──────────────────────────────────────────────

    /// @notice Auto-incrementing token ID counter
    uint256 private _tokenIds;

    /// @notice Total number of items sold
    uint256 private _itemsSold;

    /// @notice Fee charged to list an NFT (default 0.0015 ETH)
    uint256 public listingPrice = 0.0015 ether;

    // ──────────────────────────────────────────────
    //  Structs & Mappings
    // ──────────────────────────────────────────────

    struct MarketItem {
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price;
        bool sold;
        bool active;
    }

    /// @dev tokenId => MarketItem
    mapping(uint256 => MarketItem) private idToMarketItem;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event MarketItemCreated(
        uint256 indexed tokenId,
        address indexed seller,
        address owner,
        uint256 price,
        bool sold
    );

    event MarketItemSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );

    event MarketItemCancelled(
        uint256 indexed tokenId,
        address indexed seller
    );

    event MarketItemRelisted(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 newPrice
    );

    event ListingPriceUpdated(uint256 oldPrice, uint256 newPrice);

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    constructor() ERC721("MemeVault", "MEME") Ownable(msg.sender) {}

    // ──────────────────────────────────────────────
    //  Admin Functions
    // ──────────────────────────────────────────────

    /// @notice Update the platform listing fee (owner only)
    /// @param _listingPrice New fee in wei
    function updateListingPrice(uint256 _listingPrice) external onlyOwner {
        emit ListingPriceUpdated(listingPrice, _listingPrice);
        listingPrice = _listingPrice;
    }

    /// @notice Withdraw accumulated listing fees (owner only)
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "MemeVault: nothing to withdraw");
        payable(owner()).transfer(balance);
    }

    // ──────────────────────────────────────────────
    //  Core Marketplace Functions
    // ──────────────────────────────────────────────

    /// @notice Mint a new meme NFT and list it on the marketplace
    /// @param tokenURI IPFS URI for the meme metadata
    /// @param price   Desired listing price in wei
    /// @return newTokenId The newly minted token ID
    function createToken(
        string memory tokenURI,
        uint256 price
    ) external payable returns (uint256 newTokenId) {
        require(msg.value == listingPrice, "MemeVault: incorrect listing fee");
        require(price > 0, "MemeVault: price must be > 0");

        _tokenIds++;
        newTokenId = _tokenIds;

        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        _createMarketItem(newTokenId, price);
    }

    /// @notice Re-list an owned NFT for sale
    /// @param tokenId Token to re-list
    /// @param price   New listing price in wei
    function resellToken(uint256 tokenId, uint256 price) external payable {
        require(
            idToMarketItem[tokenId].owner == msg.sender,
            "MemeVault: caller is not the owner"
        );
        require(msg.value == listingPrice, "MemeVault: incorrect listing fee");
        require(price > 0, "MemeVault: price must be > 0");

        MarketItem storage item = idToMarketItem[tokenId];
        item.sold = false;
        item.active = true;
        item.price = price;
        item.seller = payable(msg.sender);
        item.owner = payable(address(this));

        _itemsSold--;

        _transfer(msg.sender, address(this), tokenId);

        emit MarketItemRelisted(tokenId, msg.sender, price);
    }

    /// @notice Purchase a listed meme NFT
    /// @param tokenId Token to purchase
    function createMarketSale(uint256 tokenId) external payable nonReentrant {
        MarketItem storage item = idToMarketItem[tokenId];

        require(item.active, "MemeVault: item is not listed");
        require(!item.sold, "MemeVault: item already sold");
        require(
            msg.value == item.price,
            "MemeVault: incorrect purchase price"
        );

        address payable seller = item.seller;

        item.owner = payable(msg.sender);
        item.sold = true;
        item.active = false;
        item.seller = payable(address(0));

        _itemsSold++;

        _transfer(address(this), msg.sender, tokenId);

        // Send listing fee to platform, remainder to seller
        payable(owner()).transfer(listingPrice);
        seller.transfer(msg.value - listingPrice);

        emit MarketItemSold(tokenId, seller, msg.sender, item.price);
    }

    /// @notice Cancel an active listing (returns NFT to seller, no fee refund)
    /// @param tokenId Token to de-list
    function cancelMarketItem(uint256 tokenId) external nonReentrant {
        MarketItem storage item = idToMarketItem[tokenId];

        require(
            item.seller == msg.sender,
            "MemeVault: only seller can cancel"
        );
        require(item.active, "MemeVault: item is not active");

        item.active = false;
        item.owner = payable(msg.sender);
        item.seller = payable(address(0));

        _transfer(address(this), msg.sender, tokenId);

        emit MarketItemCancelled(tokenId, msg.sender);
    }

    // ──────────────────────────────────────────────
    //  View / Query Functions
    // ──────────────────────────────────────────────

    /// @notice Returns the platform listing fee
    function getListingPrice() external view returns (uint256) {
        return listingPrice;
    }

    /// @notice Returns the total number of memes minted
    function getTotalMemes() external view returns (uint256) {
        return _tokenIds;
    }

    /// @notice Returns the total number of memes sold
    function getTotalSold() external view returns (uint256) {
        return _itemsSold;
    }

    /// @notice Returns a single market item by token ID
    function getMarketItem(
        uint256 tokenId
    ) external view returns (MarketItem memory) {
        return idToMarketItem[tokenId];
    }

    /// @notice Returns all currently active (unsold) market listings
    function fetchMarketItems() external view returns (MarketItem[] memory) {
        uint256 total = _tokenIds;
        uint256 count;

        for (uint256 i = 1; i <= total; i++) {
            if (idToMarketItem[i].active && !idToMarketItem[i].sold) count++;
        }

        MarketItem[] memory items = new MarketItem[](count);
        uint256 idx;

        for (uint256 i = 1; i <= total; i++) {
            if (idToMarketItem[i].active && !idToMarketItem[i].sold) {
                items[idx++] = idToMarketItem[i];
            }
        }
        return items;
    }

    /// @notice Returns all NFTs owned by the caller
    function fetchMyNFTs() external view returns (MarketItem[] memory) {
        uint256 total = _tokenIds;
        uint256 count;

        for (uint256 i = 1; i <= total; i++) {
            if (idToMarketItem[i].owner == msg.sender) count++;
        }

        MarketItem[] memory items = new MarketItem[](count);
        uint256 idx;

        for (uint256 i = 1; i <= total; i++) {
            if (idToMarketItem[i].owner == msg.sender) {
                items[idx++] = idToMarketItem[i];
            }
        }
        return items;
    }

    /// @notice Returns all listings placed by the caller
    function fetchItemsListed() external view returns (MarketItem[] memory) {
        uint256 total = _tokenIds;
        uint256 count;

        for (uint256 i = 1; i <= total; i++) {
            if (idToMarketItem[i].seller == msg.sender) count++;
        }

        MarketItem[] memory items = new MarketItem[](count);
        uint256 idx;

        for (uint256 i = 1; i <= total; i++) {
            if (idToMarketItem[i].seller == msg.sender) {
                items[idx++] = idToMarketItem[i];
            }
        }
        return items;
    }

    // ──────────────────────────────────────────────
    //  Internal Helpers
    // ──────────────────────────────────────────────

    function _createMarketItem(uint256 tokenId, uint256 price) internal {
        idToMarketItem[tokenId] = MarketItem({
            tokenId: tokenId,
            seller: payable(msg.sender),
            owner: payable(address(this)),
            price: price,
            sold: false,
            active: true
        });

        _transfer(msg.sender, address(this), tokenId);

        emit MarketItemCreated(
            tokenId,
            msg.sender,
            address(this),
            price,
            false
        );
    }
}
