import { getStorageKey } from './getStorageKey'
import { toUnspendableAddress } from './toUnspendableAddress'

export const SECRET_KEY = '0xbc005f65414869c630b7ae67836847f46f9083a9cd84af3f01969031309e5c1d'
export const BLOCK_NUMBER = 5693744
export const CONTRACT_ADDRESS = '0x10B3F9b8061CaC43BF9Ed26ffE36bAd229807829'
export const UNSPENDABLE_ADDRESS = toUnspendableAddress(SECRET_KEY)
export const STORAGE_KEY = getStorageKey(0n, UNSPENDABLE_ADDRESS)
// const STORAGE_KEY = getStorageKey(0n, '0x97248C0ddC583537a824A7ad5Ee92D5f4525bcAa')
export const MAX_DEPTH = 8
export const MAX_TRIE_NODE_LENGTH = 532
export const MAX_ACCOUNT_STATE_LENGTH = 134
export const MAX_STORAGE_VALUE_LENGTH = 32
