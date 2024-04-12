import { ethers, run } from 'hardhat'
import {} from '../typechain-types'

async function main() {
    const [deployer] = await ethers.getSigners()
    const chainId = await ethers.provider.getNetwork().then((network) => network.chainId)
    await new Promise((resolve) => setTimeout(resolve, 30_000))

    await run('verify:verify', {
        address: '0x',
        constructorArguments: [],
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
