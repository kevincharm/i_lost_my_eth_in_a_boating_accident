import { ethers } from 'hardhat'
import { SunkETH__factory } from '../typechain-types'
import { JsonRpcProvider, concat, parseEther, sha256 } from 'ethers'
import { BLOCK_NUMBER, CONTRACT_ADDRESS, SECRET_KEY, UNSPENDABLE_ADDRESS } from './config'
import { getBlockHeaderRLP } from './rlp'
import fs from 'node:fs'
import path from 'node:path'
import remintCalldata from './remintCalldata.json'

async function main() {
    const [deployer] = await ethers.getSigners()
    const sunkETH = await SunkETH__factory.connect(CONTRACT_ADDRESS, deployer).waitForDeployment()
    // Remint
    const block = await ethers.provider.send('eth_getBlockByNumber', [
        `0x${BLOCK_NUMBER.toString(16)}`,
        false,
    ])
    const nullifier = sha256(concat([SECRET_KEY, sha256(SECRET_KEY)]))
    const blockHeaderRLP = await getBlockHeaderRLP(
        block.hash,
        ethers.provider as unknown as JsonRpcProvider,
    )
    // NB: Run `nargo prove` first
    const snarkProof =
        '0x' +
        fs
            .readFileSync(path.resolve(__dirname, '../circuit/proofs/sunketh_circuit.proof'), {
                encoding: 'utf-8',
            })
            .trim()
    const tx = await sunkETH.remint(
        remintCalldata.balance,
        nullifier,
        remintCalldata.storageRootOffset,
        remintCalldata.stateProof,
        blockHeaderRLP,
        snarkProof,
    )
    console.log(tx.hash)
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
