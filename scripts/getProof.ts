import { ethers } from 'hardhat'
import { getStorageKey } from './getStorageKey'
import { solidityPacked } from 'ethers'

const CONTRACT_ADDRESS = '0x36090F95c63114A172973Af47653B7946315cc06'
const STORAGE_KEYS = [getStorageKey(0n, '0x97248C0ddC583537a824A7ad5Ee92D5f4525bcAa')]

async function main() {
    const { number: blockNumber } = await ethers.provider.getBlock('latest').then((block) => block!)
    const block = await ethers.provider.send('eth_getBlockByNumber', [
        `0x${blockNumber.toString(16)}`,
        false,
    ])
    console.log('Block')
    console.log(block)
    console.log('===\n')

    const storage = await ethers.provider.getStorage(CONTRACT_ADDRESS, STORAGE_KEYS[0])
    console.log('Storage value')
    console.log(BigInt(storage))
    console.log('===\n')

    const proof = await ethers.provider.send('eth_getProof', [
        CONTRACT_ADDRESS,
        STORAGE_KEYS,
        block.number,
    ])
    // const proof = await ethers.provider.send('eth_getProof', [
    //     '0xb16f35c0ae2912430dac15764477e179d9b9ebea',
    //     [solidityPacked(['uint256'], [1])],
    //     'latest',
    // ])
    console.log('Proof')
    console.log(JSON.stringify(proof, null, 2))
    console.log('===\n')

    const accountStateRlp = ethers.decodeRlp(proof.accountProof.slice(-1)[0])
    console.log(accountStateRlp)
    console.log(ethers.decodeRlp((accountStateRlp as string[])[1]))
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
