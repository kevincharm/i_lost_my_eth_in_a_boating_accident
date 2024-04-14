import { ethers } from 'hardhat'
import { getStorageKey } from './getStorageKey'
import { RpcGetProofResult } from './RpcGetProofResult'
import { processProof, toCombinedNargoProverToml, toNargoProverToml } from './processProof'
import { getAddress, getBytes, hexlify, sha256 } from 'ethers'
import fs from 'node:fs'
import path from 'node:path'

const SECRET_KEY = '0xbc005f65414869c630b7ae67836847f46f9083a9cd84af3f01969031309e5c1d'
const BLOCK_NUMBER = 5690456
const CONTRACT_ADDRESS = '0xa5D2D96CBB2f4fc2b493C60DB31104D77af9bf92'
const UNSPENDABLE_ADDRESS = toUnspendableAddress(SECRET_KEY)
const STORAGE_KEY = getStorageKey(0n, UNSPENDABLE_ADDRESS)
// const STORAGE_KEY = getStorageKey(0n, '0x97248C0ddC583537a824A7ad5Ee92D5f4525bcAa')

const MAX_DEPTH = 8
const MAX_TRIE_NODE_LENGTH = 532
const MAX_ACCOUNT_STATE_LENGTH = 134
const MAX_STORAGE_VALUE_LENGTH = 32

function toUnspendableAddress(s: string) {
    return getAddress(hexlify(getBytes(sha256(s)).slice(-20))) as `0x${string}`
}

// Safely convert RLP-decoded quantity to bigint
function rlpToBigInt(hex: string) {
    if (!hex.startsWith('0x')) throw new Error(`${hex} is not a valid hex value!`)
    // RLP decodes 0 to just empty bytes ("0x") sometimes(?)
    if (hex === '0x') return 0n
    return BigInt(hex)
}

async function main() {
    console.log(`Unspendable address: ${UNSPENDABLE_ADDRESS}`)
    // const { number: blockNumber } = await ethers.provider.getBlock('latest').then((block) => block!)
    const block = await ethers.provider.send('eth_getBlockByNumber', [
        `0x${BLOCK_NUMBER.toString(16)}`,
        false,
    ])
    console.log('Block')
    console.log(block)
    console.log('===\n')

    const storageValue = await ethers.provider.getStorage(CONTRACT_ADDRESS, STORAGE_KEY)
    console.log('Storage value')
    console.log(storageValue)
    console.log('===\n')

    const proof: RpcGetProofResult = await ethers.provider.send('eth_getProof', [
        CONTRACT_ADDRESS,
        [STORAGE_KEY],
        block.number,
    ])
    console.log('Proof')
    console.log(JSON.stringify(proof, null, 2))
    console.log('===\n')

    /// STATE /////////////////////////////////////////////////////////////////
    // RLP-decode last node of accountProof
    const accountStateRlp = ethers.decodeRlp(proof.accountProof.slice(-1)[0])
    const accountStateValue = getBytes(accountStateRlp[1] as string) // NB: also RLP-encoded
    console.log('Account state value')
    console.log(hexlify(accountStateValue))
    const accountState = ethers.decodeRlp(hexlify(accountStateValue)) as [
        string,
        string,
        string,
        string,
    ]
    console.log(accountState)
    const isValidAccountState =
        rlpToBigInt(accountState[0]) === BigInt(proof.nonce) &&
        rlpToBigInt(accountState[1]) === BigInt(proof.balance) &&
        accountState[2] === proof.storageHash &&
        accountState[3] === proof.codeHash
    if (!isValidAccountState) {
        throw new Error(
            `Invalid account state: ${accountState} != ${[
                proof.nonce,
                proof.balance,
                proof.storageHash,
                proof.codeHash,
            ]}`,
        )
    }
    console.log('===')

    // Process state proof
    const processedStateProof = processProof(
        proof.accountProof,
        proof.address,
        accountStateValue,
        MAX_DEPTH,
        MAX_TRIE_NODE_LENGTH,
        MAX_ACCOUNT_STATE_LENGTH,
    )
    // This is the Prover.toml for state proof
    const stateProverToml = toNargoProverToml(
        Array.from(getBytes(block.stateRoot)),
        processedStateProof,
        {
            root: 'state_root',
            proof: 'state_proof',
        },
    )
    fs.writeFileSync(path.resolve(__dirname, 'state_Prover.toml'), stateProverToml, {
        encoding: 'utf-8',
    })

    /// STORAGE ///////////////////////////////////////////////////////////////
    const processedStorageProof = processProof(
        proof.storageProof[0].proof,
        proof.storageProof[0].key,
        proof.storageProof[0].value,
        MAX_DEPTH,
        MAX_TRIE_NODE_LENGTH,
        MAX_STORAGE_VALUE_LENGTH,
    )
    // Inspect storage_proof RLPs
    const storageLeafRlp = ethers.decodeRlp(proof.storageProof[0].proof.slice(-1)[0])
    console.log('Storage leaf RLP')
    console.log(storageLeafRlp)
    console.log('===')
    // This is the Prover.toml for storage proof
    const storageProverToml = toNargoProverToml(
        Array.from(getBytes(proof.storageHash)),
        processedStorageProof,
        {
            root: 'storage_root',
            proof: 'storage_proof',
        },
    )
    fs.writeFileSync(path.resolve(__dirname, 'storage_Prover.toml'), storageProverToml, {
        encoding: 'utf-8',
    })

    const proverToml = toCombinedNargoProverToml(
        Array.from(getBytes(SECRET_KEY)),
        processedStorageProof.value,
        {
            root: Array.from(getBytes(block.stateRoot)),
            processedProof: processedStateProof,
            fieldNames: {
                root: 'state_root',
                proof: 'state_proof',
            },
        },
        {
            root: Array.from(getBytes(proof.storageHash)),
            processedProof: processedStorageProof,
            fieldNames: {
                root: 'storage_root',
                proof: 'storage_proof',
            },
        },
    )
    fs.writeFileSync(path.resolve(__dirname, '../circuit/Prover.toml'), proverToml, {
        encoding: 'utf-8',
    })
}

main()
    .then(() => {
        console.log('Done')
        process.exit(0)
    })
    .catch((err) => {
        console.error(err)
        process.exit(1)
    })
