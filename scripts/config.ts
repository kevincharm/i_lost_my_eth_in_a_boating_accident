import { parseEther } from 'ethers'
import { getStorageKey } from './getStorageKey'
import { toUnspendableAddress } from './toUnspendableAddress'

export const SECRET_KEY = '0xbc005f65414869c630b7ae67836847f46f9083a9cd84af3f01969031309e5c1d'
export const BLOCK_NUMBER = 5695383
export const CONTRACT_ADDRESS = '0x46CFe55bf2E5A02B738f5BBdc1bDEE9Dd22b5d39'
export const UNSPENDABLE_ADDRESS = toUnspendableAddress(SECRET_KEY)
export const BALANCE_TO_BURN = parseEther('0.069420')
export const STORAGE_KEY = getStorageKey(0n, UNSPENDABLE_ADDRESS)
// const STORAGE_KEY = getStorageKey(0n, '0x97248C0ddC583537a824A7ad5Ee92D5f4525bcAa')
export const MAX_DEPTH = 8
export const MAX_TRIE_NODE_LENGTH = 532
export const MAX_ACCOUNT_STATE_LENGTH = 134
export const MAX_STORAGE_VALUE_LENGTH = 32
