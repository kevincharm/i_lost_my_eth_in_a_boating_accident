import { getAddress, getBytes, hexlify, sha256 } from 'ethers'

export function toUnspendableAddress(s: string) {
    return getAddress(hexlify(getBytes(sha256(s)).slice(-20))) as `0x${string}`
}
