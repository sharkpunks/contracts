// SPDX-License-Identifier: WTFPL

pragma solidity 0.8.13;

import "./interfaces/INFT.sol";

contract NFTSigmoidCurverOffering {
    uint256 public constant TOKEN_ID_MIN = 1083;
    uint256 public constant TOKEN_ID_MAX = 6900;
    uint256 public constant INITIAL_PRICE = 333 * 10**14;
    uint256 public constant INFLATION_RATE = 2496;
    uint256 public constant INFLATION_BASE = 10000;
    uint256 public constant DISCOUNT_PERCENTAGE = 10;
    uint256 internal constant FINAL_PRICE = 93716465580792648570;
    uint256 internal constant INFLECTION_POINT = 3992;

    address public immutable vault;
    address public immutable token;
    address public immutable discountToken;

    uint256 public tokenId;

    mapping(uint256 => uint256) internal _priceHistory;

    event Mint(uint256 indexed tokenId, uint256 price);

    modifier discountApplied {
        require(INFT(discountToken).balanceOf(msg.sender) > 0, "SCO: DISCOUNT_TOKEN_NOT_OWNED");
        _;
    }

    constructor(
        address _token,
        address _vault,
        address _discountToken
    ) {
        token = _token;
        vault = _vault;
        discountToken = _discountToken;

        tokenId = TOKEN_ID_MIN;
        _priceHistory[TOKEN_ID_MIN] = INITIAL_PRICE;
    }

    function mintBatchDiscounted(address to, uint256 length) external payable discountApplied {
        _mintBatch(to, length, true);
    }

    function mintBatch(address to, uint256 length) external payable {
        _mintBatch(to, length, false);
    }

    function _mintBatch(
        address to,
        uint256 length,
        bool discount
    ) internal {
        uint256 _tokenId = tokenId;

        uint256 totalPrice;
        uint256[] memory tokenIds = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            require(_tokenId < TOKEN_ID_MAX, "SCO: ALL_MINTED");

            uint256 price = _price(_tokenId);
            if (discount) price -= (price * DISCOUNT_PERCENTAGE) / 100;
            totalPrice += price;

            emit Mint(_tokenId, price);

            tokenIds[i] = _tokenId;
            _tokenId++;
        }
        tokenId = _tokenId;

        require(msg.value >= totalPrice, "SCO: INSUFFICIENT_ETH");
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }

        INFT(token).mintBatch(to, tokenIds, "");
    }

    function mintDiscounted(address to) external payable discountApplied {
        _mint(to, true);
    }

    function mint(address to) external payable {
        _mint(to, false);
    }

    function _mint(address to, bool discount) internal {
        uint256 _tokenId = tokenId;
        require(_tokenId < TOKEN_ID_MAX, "SCO: ALL_MINTED");
        tokenId = _tokenId + 1;

        uint256 price = _price(_tokenId);
        if (discount) price -= (price * DISCOUNT_PERCENTAGE) / 100;

        require(msg.value >= price, "SCO: INSUFFICIENT_ETH");
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        emit Mint(_tokenId, price);

        INFT(token).mint(to, _tokenId, "");
    }

    function _price(uint256 _tokenId) internal returns (uint256 price) {
        if (_tokenId < INFLECTION_POINT) {
            price = _priceHistory[_tokenId];
            _priceHistory[_tokenId + 1] = (price * INFLATION_RATE) / INFLATION_BASE;
        } else {
            price = FINAL_PRICE - _priceHistory[INFLECTION_POINT * 2 - 2 - _tokenId];
        }
    }
}
