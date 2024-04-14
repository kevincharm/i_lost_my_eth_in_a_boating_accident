import { ethers } from 'hardhat'
import { getStorageKey } from './getStorageKey'
import { RpcGetProofResult } from './RpcGetProofResult'
import { processProof, toNargoProverToml } from './processProof'
import { getBytes } from 'ethers'
import fs from 'node:fs'
import path from 'node:path'

const BLOCK_NUMBER = 5689270
const CONTRACT_ADDRESS = '0x36090F95c63114A172973Af47653B7946315cc06'
const STORAGE_KEY = getStorageKey(0n, '0x97248C0ddC583537a824A7ad5Ee92D5f4525bcAa')

const MAX_DEPTH = 8
const MAX_TRIE_NODE_LENGTH = 532
const MAX_ACCOUNT_STATE_LENGTH = 134
const MAX_STORAGE_VALUE_LENGTH = 32

async function main() {
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
    const accountStateValue = getBytes(accountStateRlp[1] as string)

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
    // fs.writeFileSync(path.resolve(__dirname, 'state_Prover.toml'), stateProverToml, {
    //     encoding: 'utf-8',
    // })

    /// STORAGE ///////////////////////////////////////////////////////////////
    const processedStorageProof = processProof(
        proof.storageProof[0].proof,
        proof.storageProof[0].key,
        proof.storageProof[0].value,
        MAX_DEPTH,
        MAX_TRIE_NODE_LENGTH,
        MAX_STORAGE_VALUE_LENGTH,
    )
    // This is the Prover.toml for storage proof
    const storageProverToml = toNargoProverToml(
        Array.from(getBytes(proof.storageHash)),
        processedStorageProof,
        {
            root: 'storage_root',
            proof: 'storage_proof',
        },
    )
    // fs.writeFileSync(path.resolve(__dirname, 'storage_Prover.toml'), storageProverToml, {
    //     encoding: 'utf-8',
    // })
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
    