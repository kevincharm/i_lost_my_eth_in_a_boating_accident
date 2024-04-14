import { ethers, run } from 'hardhat'
import { SunkETH__factory, UltraVerifier__factory } from '../typechain-types'

async function main() {
    const [deployer] = await ethers.getSigners()
    const verifier = await new UltraVerifier__factory(deployer)
        .deploy()
        .then((tx) => tx.waitForDeployment())
    const sunkETH = await new SunkETH__factory(deployer)
        .deploy(await verifier.getAddress())
        .then((tx) => tx.waitForDeployment())
    console.log(`Deployed SunkETH at ${await sunkETH.getAddress()}`)

    await new Promise((resolve) => setTimeout(resolve, 30_000))
    await run('verify:verify', {
        address: await verifier.getAddress(),
        constructorArguments: [],
    })
    await run('verify:verify', {
        address: await sunkETH.getAddress(),
        constructorArguments: [await verifier.getAddress()],
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
