import { ethers } from 'ethers'
import sunkETHForgeOut from "../../out/SunkETH.sol/SunkETH.json"  assert { type: 'json' };
const sunkETHABI = sunkETHForgeOut.abi
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { Noir } from '@noir-lang/noir_js';
import {getStateProofs} from "./getStateProofs"
import {getBlockWithRLP} from './rlp.js'

//TODO replace with the real circuit
import circuit from "../../nullifierCircuitTest/target/nullifier.json"


export class SunkEthInteracter {

    /**
     * 
     * @param {ethers.AddressLike} sunkEthContractAddress 
     * @param {ethers.Signer} signer 
     */
    constructor(sunkEthContractAddress, signer = undefined) {
        this.signer = signer
        this.provider = signer.provider
        this.sunkEthContract = new ethers.Contract(sunkEthContractAddress, sunkETHABI, signer.provider);
        if (signer) {
            this.sunkEthContractWithSigner = this.sunkEthContract.connect(signer)
        }


    }

    static async setupWasm() {
        await Promise.all([
          import("@noir-lang/noirc_abi").then(module => 
            module.default(new URL("@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm", import.meta.url).toString())
          ),
          import("@noir-lang/acvm_js").then(module => 
            module.default(new URL("@noir-lang/acvm_js/web/acvm_js_bg.wasm", import.meta.url).toString())
          )
        ]);
      }

    /**
    * 
    * 
    * @param {BigInt | string} amount 
    */
    async wrapEth(amount) {
        const options = { value: amount }
        const tx = await this.sunkEthContractWithSigner.deposit(options)
        return tx
    }

    /**
     * 
     * @param {BigInt | string} amount 
     */
    async unwrapEth(amount) {
        const tx = await this.sunkEthContractWithSigner.withdraw(amount)
        return tx
    }
    
    /**
     * 
     * @param {Uint8Array} secret (lenght=32)
     * @returns 
     */
    static getNullifierData(secret) {
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
        const { proofInputs: nullifierData, burnAddress } = SunkEthInteracter.getNullifierData(secret)



        //burn it!! yay
        const tx = await this.sunkEthContractWithSigner.transfer(burnAddress, amount)

        localStorage.setItem(ethers.getAddress(burnAddress), JSON.stringify(nullifierData));

        return tx

        //TODO save proofInputs (contains secret) to local storage
    }

    async unShieldTokens(nullifierData) {
        const burnAddress = ethers.hexlify(nullifierData.burnAddressBytes)
        console.log(this.signer)
        const storageProof = await getStateProofs(burnAddress, this.provider)
        console.log(storageProof)
        const block = await this.provider.getBlock()
        const blockHeaderRLP = await getBlockWithRLP(block.hash, this.provider)
        console.log(blockHeaderRLP)
        console.log("real blockhash: ", block.hash)
        console.log("rlp reconstructec blockhash: ", ethers.keccak256(ethers.toBeArray(blockHeaderRLP)))

        await SunkEthInteracter.setupWasm()
        const backend = new BarretenbergBackend(circuit);
        const noir = new Noir(circuit, backend);


        const unspendable_address = nullifierData.burnAddressBytes;
        const pubNullifier = nullifierData.nullifierBytes; 
        const s = nullifierData.secret;
        const input = {s:Array.from(s),unspendable_address:Array.from(unspendable_address),pubNullifier:Array.from(pubNullifier)}
        console.log(input)
        console.log("circuit: ", circuit)
        const proof = await noir.generateProof(input);
        console.log("proof: ", proof)
        console.log ("is verified (local): ",await noir.verifyProof(proof))
        console.log(nullifierData)
        console.warn("TODO implement")

        // uint256 wad,
        // bytes32 nullifier,
        // bytes calldata blockHeaderRLP,
        // bytes calldata snarkProof
        const amount = await this.sunkEthContract.balanceOf(burnAddress)
        console.log("args: ", {amount, pubNullifier, blockHeaderRLP, proof:proof.proof})
        //console.log("args arr: ", JSON.stringify(amount, pubNullifier, blockHeaderRLP, proof.proof))
        console.log(amount, ethers.hexlify(pubNullifier), blockHeaderRLP,ethers.hexlify( proof.proof))
        const tx = await this.sunkEthContractWithSigner.remint(amount, ethers.hexlify(pubNullifier), blockHeaderRLP,ethers.hexlify( proof.proof))
        return tx
    }

    async isClaimed(nullifier) {
        return await this.sunkEthContract.nullifiers(nullifier)
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
        const parsedAmount = ethers.parseUnits(amount, units)
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
                //silly js turned Uint8Array into a normal obj when it wen into local storage
                nullifierData.nullifierBytes = new Uint8Array(Object.entries(nullifierData.nullifierBytes).map((x) => x[1]))
                nullifierData.burnAddressBytes = new Uint8Array(Object.entries(nullifierData.burnAddressBytes).map((x) => x[1]))
                nullifierData.secret = new Uint8Array(Object.entries(nullifierData.secret).map((x) => x[1]))

                const isClaimed = await this.isClaimed(nullifierData.nullifierBytes)

                deposits[address] = { isClaimed, amount, nullifierData }
            }
        }
        return deposits
    }

}

const secret = new Uint8Array([223, 2, 3, 64, 160, 235, 45, 12, 98, 202, 111, 134, 57, 86, 76, 30, 208, 94, 40, 196, 212, 31, 56, 207, 174, 228, 240, 24, 98, 250, 227, 179])
console.log(SunkEthInteracter.getNullifierData(secret))