// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.25;

import {IWETH9} from "./interfaces/IWETH9.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {RLPReader} from "./lib/RLPReader.sol";

contract SunkETH is IWETH9, ERC20 {
    using RLPReader for bytes;
    using RLPReader for RLPReader.RLPItem;

    /// @notice Proof-of-sunken-boat nullifier
    mapping(bytes32 nullifier => bool) public nullifiers;

    error TransferFailed(bytes data);
    error UnknownBlock(uint256 blockNumber);

    constructor() ERC20("I lost my ETH in a boating accident", "ETHEREUM") {
        // TODO: Remove
        _mint(msg.sender, 69420 ether);
    }

    /// @notice Deposit ETH, get SunkETH
    function deposit() external payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice Burn SunkETH, get ETH back
    function withdraw(uint256 wad) external {
        _burn(msg.sender, wad);
        (bool success, bytes memory data) = msg.sender.call{value: wad}("");
        if (!success) {
            revert TransferFailed(data);
        }
        emit Withdrawal(msg.sender, wad);
    }

    error InvalidBlockHeader(
        bytes32 expectedBlockHash,
        bytes32 actualBlockHash,
        bytes blockHeaderRLP
    );

    /// @notice Re-mint tokens from sunken boats
    /// @param wad How much
    /// @param blockHeaderRLP Block header RLP corresponding to blockhash
    /// @param snarkProof SNARK proof bytes
    function remint(
        uint256 wad,
        bytes32 nullifier,
        bytes calldata blockHeaderRLP,
        bytes calldata snarkProof
    ) external {
        // Verify block header RLP against known blockhash
        RLPReader.RLPItem[] memory blockHeader = blockHeaderRLP.readList();
        uint256 blockNum = blockHeader[8].readUint256();
        bytes32 blkhash = blockhash(blockNum);
        if (blkhash == 0) {
            revert UnknownBlock(blockNum);
        }
        if (blkhash != keccak256(blockHeaderRLP)) {
            revert InvalidBlockHeader(
                blkhash,
                keccak256(blockHeaderRLP),
                blockHeaderRLP
            );
        }
        // Read out state root from block header
        // TODO: Double check that this actually works or if bytes32 needs to
        // decoded differently
        bytes32 stateRoot = bytes32(blockHeader[3].readUint256());
        // TODO: Verify SNARK proof against wad, stateRoot, nullifier
    }
}
