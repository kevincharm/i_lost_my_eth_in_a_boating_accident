import { ethers } from 'hardhat'
import { SunkETH__factory } from '../typechain-types'
import { BALANCE_TO_BURN, CONTRACT_ADDRESS, UNSPENDABLE_ADDRESS } from './config'

async function main() {
    const [deployer] = await ethers.getSigners()
    const sunkETH = await SunkETH__factory.connect(CONTRACT_ADDRESS, deployer).waitForDeployment()
    // Wrap
    await sunkETH
        .deposit({
            value: BALANCE_TO_BURN,
        })
        .then((tx) => tx.wait(1))
    // Burn
    const tx = await sunkETH.transfer(UNSPENDABLE_ADDRESS, BALANCE_TO_BURN).then((tx) => tx.wait(1))
    console.log(
        `Deposited and burnt ${BALANCE_TO_BURN} ETH to ${UNSPENDABLE_ADDRESS} at block ${tx?.blockNumber}`,
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
