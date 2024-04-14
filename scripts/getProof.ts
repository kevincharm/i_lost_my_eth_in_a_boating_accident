import { ethers } from 'hardhat'
import { RpcGetProofResult } from './RpcGetProofResult'
import { processProof, toCombinedNargoProverToml, toNargoProverToml } from './processProof'
import { getBytes, hexlify, zeroPadValue } from 'ethers'
import fs from 'node:fs'
import path from 'node:path'
import {
    UNSPENDABLE_ADDRESS,
    BLOCK_NUMBER,
    CONTRACT_ADDRESS,
    STORAGE_KEY,
    MAX_DEPTH,
    MAX_TRIE_NODE_LENGTH,
    MAX_ACCOUNT_STATE_LENGTH,
    MAX_STORAGE_VALUE_LENGTH,
    SECRET_KEY,
} from './config'

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
    console.log(`state_proof.length = ${processedStateProof.proof.length * 32} bytes`)
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
    let storageRootOffset = hexlify(new Uint8Array(processedStateProof.value)).lastIndexOf(
        proof.storageHash.slice(2),
    ) // dodgy af
    if (storageRootOffset === -1) {
        throw new Error('Could not find storageRoot in value')
    }
    storageRootOffset = (storageRootOffset - 2) / 2
    // Sanity
    console.log(
        `${hexlify(
            new Uint8Array(processedStateProof.value).slice(
                storageRootOffset,
                storageRootOffset + 32,
            ),
        )} ?= ${proof.storageHash}`,
    )
    const calldata = {
        balance: zeroPadValue(hexlify(new Uint8Array(processedStorageProof.value)), 32),
        storageRootOffset,
        stateProof: {
            key: hexlify(new Uint8Array(processedStateProof.key)),
            proof: hexlify(new Uint8Array(processedStateProof.proof)),
            depth: processedStateProof.depth,
            value: hexlify(new Uint8Array(processedStateProof.value)),
        },
        storageRoot: proof.storageHash,
    }
    fs.writeFileSync(
        path.resolve(__dirname, './remintCalldata.json'),
        JSON.stringify(calldata, null, 2),
        {
            encoding: 'utf-8',
        },
    )
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
    