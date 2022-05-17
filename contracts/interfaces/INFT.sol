// SPDX-License-Identifier: WTFPL

pragma solidity >=0.5.0;

interface INFT {
    function balanceOf(address owner) external view returns (uint256 balance);

    function mint(
        address to,
        uint256 tokenId,
        bytes calldata data
    ) external;

    function mintBatch(
        address to,
        uint256[] calldata tokenIds,
        bytes calldata data
    ) external;
}
