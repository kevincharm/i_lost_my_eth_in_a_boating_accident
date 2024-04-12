import { ethers, getBytes, keccak256 } from 'ethers'
import assert from 'assert'
const abi = ethers.AbiCoder.defaultAbiCoder()

/// Get storage key for mapping(address => xxx)
/// @param slot # slot of mapping
/// @param address address key
export function getStorageKey(slot: bigint, address: `0x${string}`) {
    const preimage = getBytes(abi.encode(['address', 'uint256'], [address, slot]))
    assert(preimage.byteLength == 64, 'Invariant violation: invalid preimage length')
    return keccak256(preimage)
}
