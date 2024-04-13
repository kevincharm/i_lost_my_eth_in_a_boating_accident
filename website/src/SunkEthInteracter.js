import { ethers } from 'ethers'
import sunkETHABI  from "../../exported/abi/SunkETH.json"  assert { type: 'json' };

export class SunkEthInteracter {

    /**
     * 
     * @param {ethers.AddressLike} sunkEthContractAddress 
     * @param {ethers.Signer} signer 
     */
    constructor(sunkEthContractAddress, signer=undefined) {
        this.sunkEthContract = new ethers.Contract(sunkEthContractAddress, sunkETHABI, signer.provider);
        if(signer) {
            this.sunkEthContractWithSigner = this.sunkEthContract.connect(signer)

        }
       

    }
    /**
     * 
     * @param {Uint8Array} secret (lenght=32)
     * @returns 
     */
    static getProofInputs(secret) {
        const burnAddress = ethers.sha256(secret).slice(0, -24)
        const burnAddressBytes = ethers.toBeArray(burnAddress)
        const concatBytes = new Uint8Array([...secret, ...burnAddressBytes])
        const nullifier = ethers.sha256(concatBytes)
        const nullifierBytes = ethers.toBeArray(nullifier)


        const proofInputs = { burnAddressBytes, nullifierBytes, secret }
        return { proofInputs, burnAddress }
    }

    /**
     * stores nullifier, burnaddress and secret in localstorage with the burn address as key
     * @param {BigInt} amount 
     * @returns 
     */
    async shieldTokens(amount) {

        //TODO check if user not accidently sending to address that already has a ballance
        //to prevent using a address twice (and thus potentually burning funds)
        const secret = crypto.getRandomValues(new Uint8Array(32))
        const { proofInputs: nullifierData, burnAddress } = SunkEthInteracter.getProofInputs(secret)



        //burn it!! yay
        await this.sunkEthContractWithSigner.transfer(burnAddress, amount)

        localStorage.setItem(ethers.getAddress(burnAddress), JSON.stringify(nullifierData));

        return secret

        //TODO save proofInputs (contains secret) to local storage
    }

    async unShieldTokens(nullifierData) {
        console.log(nullifierData)
        console.warn("TODO implement")
    }

    async isClaimed(nullifier) {
        return await this.sunkEthContractWithSigner.nullifiers(nullifier)
    }

    /**
     * 
     * 
     * @param {BigInt | string} amount 
     */
    async wrapEth(amount) {
        const options = { value: ethers.parseEther(amount) }
        await this.sunkEthContractWithSigner.deposit(options)
    }

    /**
     * 
     * @param {BigInt | string} amount 
     */
    async unwrapEth(amount) {
        await this.sunkEthContractWithSigner.withdraw(amount)
    }

    async getUnits() {
        if (this.units) {
            return this.units
        } else {
            this.units = await this.sunkEthContract.decimals()
            return this.units
        }
    }

    /**
     * 
     * @param {string} amount 
     * @returns {BigInt} 
     */
    async parseAmount(amount) {
        const units = await this.getUnits()
        const parsedAmount  = ethers.parseUnits(amount, units)
        return parsedAmount
    }

    async formatAmount(amount) {
        const units = await this.getUnits()
        const formattedAmount = ethers.formatUnits(amount, units)
        return formattedAmount

    }

    async getDepositFromLocalStorage() {
        let deposits = {}
        for (const key in localStorage) {
            if (ethers.isAddress(key)) { 
                const address = ethers.getAddress(key)
                const amount = await this.sunkEthContract.balanceOf(address)

                const nullifierData = JSON.parse(localStorage[key])
                nullifierData.nullifierBytes = new Uint8Array(Object.entries(nullifierData.nullifierBytes).map((x)=>x[0]))
                nullifierData.burnAddressBytes = new Uint8Array(Object.entries(nullifierData.burnAddressBytes).map((x)=>x[0]))
                nullifierData.secret = new Uint8Array(Object.entries(nullifierData.burnAddressBytes).map((x)=>x[0]))
                const isClaimed = await this.isClaimed(nullifierData.nullifierBytes)
                
                deposits[address] = {isClaimed, amount, nullifierData}
            }
        }
        return deposits
    }

}

const secret = new Uint8Array([223, 2, 3, 64, 160, 235, 45, 12, 98, 202, 111, 134, 57, 86, 76, 30, 208, 94, 40, 196, 212, 31, 56, 207, 174, 228, 240, 24, 98, 250, 227, 179])
console.log(SunkEthInteracter.getProofInputs(secret))