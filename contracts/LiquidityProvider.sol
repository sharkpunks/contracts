// SPDX-License-Identifier: WTFPL

pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@sushiswap/core/contracts/uniswapv2/interfaces/IUniswapV2Router01.sol";
import "@sushiswap/core/contracts/uniswapv2/interfaces/IUniswapV2Pair.sol";
import "./interfaces/IETHVault.sol";

contract LiquidityProvider is Ownable {
    address public immutable vault;
    address public immutable router;
    address public immutable token;
    address public immutable treasury;
    address public immutable weth;
    uint256 public lpRatio;

    event SetLPRatio(uint256 lpRatio);
    event Receive(address indexed from, uint256 amount);
    event SwapETH(uint256 amountETHIn, uint256 amountTokenOut);
    event AddLiquidity(
        uint256 amount,
        uint256 amountTokenIn,
        uint256 amountETHIn,
        uint256 amountTokenLP,
        uint256 amountETHLP,
        uint256 liquidity
    );

    constructor(
        address _vault,
        address _router,
        address _token,
        address _treasury,
        uint256 _lpRatio
    ) {
        require(_lpRatio <= 10**18, "LP: INVALID_LP_RATIO");

        vault = _vault;
        router = _router;
        token = _token;
        treasury = _treasury;
        lpRatio = _lpRatio;

        weth = IUniswapV2Router01(_router).WETH();
    }

    receive() external payable {
        emit Receive(msg.sender, msg.value);
    }

    function setLPRatio(uint256 _lpRatio) external onlyOwner {
        require(_lpRatio <= 10**18, "LP: INVALID_LP_RATIO");

        lpRatio = _lpRatio;

        emit SetLPRatio(_lpRatio);
    }

    function addLiquidity(
        uint256 amount,
        uint256 amountTokenIn,
        uint256 amountTokenMinLP,
        uint256 amountETHMinLP
    ) external onlyOwner {
        IETHVault(vault).withdraw(amount, address(this));

        uint256 amountETHIn = (amount * lpRatio) / (10**18);
        (uint256 amountTokenLP, uint256 amountETHLP, uint256 liquidity) = IUniswapV2Router01(router).addLiquidityETH{
            value: amountETHIn
        }(token, amountTokenIn, amountTokenMinLP, amountETHMinLP, treasury, block.timestamp);
        emit AddLiquidity(amount, amountTokenIn, amountETHIn, amountTokenLP, amountETHLP, liquidity);
    }

    function swap(uint256 amountETHIn, uint256 amountTokenOutMin) external onlyOwner {
        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = token;
        uint256[] memory amounts = IUniswapV2Router01(router).swapExactETHForTokens{value: amountETHIn}(
            amountTokenOutMin,
            path,
            treasury,
            block.timestamp
        );
        emit SwapETH(amountETHIn, amounts[2]);
    }
}
