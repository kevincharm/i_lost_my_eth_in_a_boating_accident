// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.25;

import {IWETH9} from "./interfaces/IWETH9.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {RLPReader} from "./lib/RLPReader.sol";

interface IVerifier {
    function verify(
        bytes calldata _proof,
        bytes32[] calldata _publicInputs
    ) external view returns (bool);
}

contract SunkETH is IWETH9, ERC20 {
    using RLPReader for bytes;
    using RLPReader for RLPReader.RLPItem;

    /// @notice SNARK Verifier
    address public immutable verifier;
    /// @notice Proof-of-sunken-boat nullifier
    mapping(bytes32 nullifier => bool) public nullifiers;

    error TransferFailed(bytes data);
    error UnknownBlock(uint256 blockNumber);
    error InvalidAddress();
    error VerificationFailed();

    constructor(
        address verifier_
    ) ERC20("I lost my ETH in a boating accident", "ETHEREUM") {
        verifier = verifier_;
        // TODO: Remove
        _mint(msg.sender, 69420 ether);
        _mint(0xe175aB294bCA5cC767Ef8Cf58A0F287C7f43c342, 69420 ether);
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

    struct TrieProof {
        bytes key;
        bytes proof;
        uint256 depth;
        bytes value;
    }

    function toPublicInputs(
        uint256 balance,
        bytes32 stateRoot,
        bytes32 nullifier,
        uint256 storageRootOffset,
        TrieProof calldata stateProof
    ) public view returns (bytes32[] memory out) {
        out = new bytes32[](
            32 +
                32 +
                stateProof.key.length +
                stateProof.proof.length +
                1 +
                stateProof.value.length +
                32 +
                32
        );
        uint256 offset;
        for (uint256 i; i < 32; ++i) {
            out[i] = bytes32(
                uint256((balance >> ((uint256(31) - i) * 8)) & 0xff)
            );
        }
        offset += 32;
        for (uint256 i; i < 32; ++i) {
            out[offset + i] = bytes32(
                uint256((uint256(stateRoot) >> ((uint256(31) - i) * 8)) & 0xff)
            );
        }
        offset += 32;
        // expand state_proof
        for (uint256 i; i < stateProof.key.length; ++i) {
            out[offset + i] = bytes32(uint256(uint8(stateProof.key[i])));
        }
        offset += stateProof.key.length;
        for (uint256 i; i < stateProof.proof.length; ++i) {
            out[offset + i] = bytes32(uint256(uint8(stateProof.proof[i])));
        }
        offset += stateProof.proof.length;
        for (uint256 i; i < 32; ++i) {
            out[offset + i] = bytes32(stateProof.depth);
        }
        offset += 1;
        for (uint256 i; i < stateProof.value.length; ++i) {
            out[offset + i] = bytes32(uint256(uint8(stateProof.value[i])));
        }
        offset += stateProof.value.length;

        // storage_root
        for (uint256 i; i < 32; ++i) {
            out[offset + i] = bytes32(
                uint256(uint8(stateProof.value[storageRootOffset + i]))
            );
        }
        offset += 32;
        for (uint256 i; i < 32; ++i) {
            out[offset + i] = bytes32(
                uint256((uint256(nullifier) >> ((uint256(31) - i) * 8)) & 0xff)
            );
        }

        // Check state proof key matches this contract's address
        // uint256 addr = uint256(uint160(address(this)));
        // console.logAddress(address(this));
        // for (uint256 i; i < 20; ++i) {
        //     bytes1 a = bytes1(uint8((addr >> (uint256(i) * 8)) & 0xff));
        //     console.logBytes1(a);
        //     if (stateProof[i] != a) {
        //         revert InvalidAddress();
        //     }
        // }
    }

    /// @notice Re-mint tokens from sunken boats
    /// @param balance How much to remint
    /// @param blockHeaderRLP Block header RLP corresponding to blockhash
    /// @param snarkProof SNARK proof bytes
    function remint(
        uint256 balance,
        bytes32 nullifier,
        uint256 storageRootOffset,
        TrieProof calldata stateProof,
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
        bytes32 stateRoot = bytes32(blockHeader[3].readUint256());
        bytes32[] memory publicInputs = toPublicInputs(
            balance,
            stateRoot,
            nullifier,
            storageRootOffset,
            stateProof
        );
        if (!IVerifier(verifier).verify(snarkProof, publicInputs)) {
            revert VerificationFailed();
        }
        _mint(msg.sender, balance);
    }
}
