import assert from 'assert';
import { ethers } from 'ethers'
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { Noir } from '@noir-lang/noir_js';

import {getBlockWithRLP} from './rlp.js'
import { getStorageKey } from '../../scripts/getStorageKey'
import {processProof} from '../../scripts/processProof'
import { toUnspendableAddress } from '../../scripts/toUnspendableAddress'

import circuit from "../../circuit/target/sunketh_circuit.json"
import sunkETHABI from "../../exported/abi/SunkETH.json"  assert { type: 'json' };

export const MAX_DEPTH = 8
export const MAX_TRIE_NODE_LENGTH = 532
export const MAX_ACCOUNT_STATE_LENGTH = 134
export const MAX_STORAGE_VALUE_LENGTH = 32

export class SunkEthInteracter {
    /**
     * 
     * @param {ethers.HexString} input 
     * @param {Number} bytes 
     * @returns 
     */
    static splitBytes = (input, bytes) => {
        const regEx = new RegExp(`.{1,${2*bytes}}`, "g")
        return input.slice(2).match(regEx).map((x)=>"0x"+x)

    }
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
        const burnAddress = toUnspendableAddress(secret)
        const burnAddressBytes = ethers.toBeArray(burnAddress)
        const nullifier = ethers.sha256(ethers.concat([secret, ethers.sha256(secret)]))
        const nullifierBytes = ethers.toBeArray(nullifier)


        const proofInputs = { burnAddressBytes, nullifierBytes, secret }
        return { proofInputs, burnAddress }
    }

    static async getProofFromEndPoint({secret, balance, stateProof, storageProof}) {
        const args = {secret, balance, stateProof, storageProof}
        
        const response = await fetch('http://localhost:8888/prove', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(args)
        })

        const proof = await response.json()
        return proof.proof

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
    }

    static makeValuesIntoNumbers(obj) {
        return Object.fromEntries(Object.entries(obj).map((x)=>{
            if (typeof(x[1]) === "string" && x[1].startsWith("0x")) {
                const arr =  x[1].slice(2).match(/.{1,66}/g).map((x)=>"0x"+x)//[x[0],[...(ethers.toBeArray(x[1]))]]
                if (arr.length === 1 ) {
                    return [x[0], BigInt(arr[0]).toString]
                } else {
                    return [x[0],[...Uint32Array.from(arr)].map((x)=>x.toString()) ]
                }

            } else {
                return [x[0],x[1]]
            }
            
        }))
    }
    
    /**
     * 
     * @param {ethers.BytesLike} SECRET_KEY 
     * @param {*} BLOCK_NUMBER 
     * @param {ethers.BytesLike} snarkProof 
     * @param {Bool} useTrustedProver the circuit is too large for noirjs so a trusted endpoint (nargo prove) can be used 
     * @returns 
     */
    async unShieldTokens(SECRET_KEY, BLOCK_NUMBER, snarkProof=undefined, useTrustedProver=true) {
        const CONTRACT_ADDRESS =   this.sunkEthContract.target //'0x46CFe55bf2E5A02B738f5BBdc1bDEE9Dd22b5d39'

        const UNSPENDABLE_ADDRESS = toUnspendableAddress(SECRET_KEY)
        const STORAGE_KEY = getStorageKey(0n, UNSPENDABLE_ADDRESS)

        const nullifier = ethers.sha256(ethers.concat([SECRET_KEY, ethers.sha256(SECRET_KEY)]))
        

        const block = await this.provider.send('eth_getBlockByNumber', [
            `0x${BLOCK_NUMBER.toString(16)}`,
            false,
        ])

        const storageProof = await this.provider.send('eth_getProof', [
            CONTRACT_ADDRESS,
            [STORAGE_KEY],
            block.number,
        ])

        const accountStateRlp = ethers.decodeRlp(storageProof.accountProof.slice(-1)[0])
        const accountStateValue = ethers.getBytes(accountStateRlp[1]) // NB: also RLP-encoded

        const processedStateProof = processProof(
            storageProof.accountProof,
            storageProof.address,
            accountStateValue,
            MAX_DEPTH,
            MAX_TRIE_NODE_LENGTH,
            MAX_ACCOUNT_STATE_LENGTH,
        )

        processedStateProof.storageHash = storageProof.storageHash
        const storageRootOffset = SunkEthInteracter.getStorageRootOffset(processedStateProof)

        const processedStorageProof = processProof(
            storageProof.storageProof[0].proof,
            storageProof.storageProof[0].key,
            storageProof.storageProof[0].value,
            MAX_DEPTH,
            MAX_TRIE_NODE_LENGTH,
            MAX_STORAGE_VALUE_LENGTH,
        )

        const formattedStateProof = {
            key: ethers.hexlify(new Uint8Array(processedStateProof.key)),
            proof: ethers.hexlify(new Uint8Array(processedStateProof.proof)),
            depth: processedStateProof.depth,
            value: ethers.hexlify(new Uint8Array(processedStateProof.value)),
        }

        const formattedStorageProof = {
            key: ethers.hexlify(new Uint8Array(processedStorageProof.key)),
            proof: ethers.hexlify(new Uint8Array(processedStorageProof.proof)),
            depth: processedStorageProof.depth,
            value: ethers.hexlify(new Uint8Array(processedStorageProof.value)),
        }

        const blockHeaderRLP = await getBlockWithRLP(block.hash, this.provider)

        const args = {
            balance: ethers.zeroPadValue(ethers.hexlify(new Uint8Array(processedStorageProof.value)), 32),
            nullifier: nullifier,
            storageRootOffset: storageRootOffset,
            stateProof: formattedStateProof,
            blockHeaderRLP: blockHeaderRLP,
        }

        const split = (input)=>SunkEthInteracter.splitBytes(input, 1)

        if (snarkProof === undefined) {
            const snarkInput = {
                s: split(SECRET_KEY), 
                balance: split(args.balance),
                state_root: split(block.stateRoot),
                state_proof: {
                    key: split(formattedStateProof.key),
                    proof: split(formattedStateProof.proof),
                    depth: formattedStateProof.depth,
                    value: split(formattedStateProof.value)
                },
                storage_root:   split(storageProof.storageHash), 
                storage_proof: {
                    key: split(formattedStorageProof.key),
                    proof: split(formattedStorageProof.proof),
                    depth: formattedStorageProof.depth,
                    value: split(formattedStorageProof.value)
                }
            }
            console.log("snark input: ",snarkInput)
            if (useTrustedProver) {
                snarkProof = await SunkEthInteracter.getProofFromEndPoint({
                    secret: Array.from(ethers.toBeArray(SECRET_KEY)),
                    balance: Array.from(processedStorageProof.value),
                    stateProof: {
                        root: Array.from(ethers.getBytes(block.stateRoot)),
                        processedProof: processedStateProof,
                        fieldNames: {
                            root: 'state_root',
                            proof: 'state_proof',
                        },
                    },
                    storageProof: {
                        root: Array.from(ethers.getBytes(storageProof.storageHash)),
                        processedProof: processedStorageProof,
                        fieldNames: {
                            root: 'storage_root',
                            proof: 'storage_proof',
                        },
                    },

                })
 
            } else {
                await SunkEthInteracter.setupWasm()
                const backend = new BarretenbergBackend(circuit);
                const noir = new Noir(circuit, backend);
                snarkProof = await noir.generateProof(snarkInput);
            }
        }

        args.snarkProof = snarkProof

        console.log("constract call input: ",args)
        const tx = await this.sunkEthContractWithSigner.remint(
            args.balance,
            args.nullifier,
            args.storageRootOffset,
            args.stateProof,
            args.blockHeaderRLP,
            args.snarkProof,
        )
        return tx
    }

    static getStorageRootOffset(proof) {
        console.log("PROOF ", proof)
        let storageRootOffset = ethers.hexlify(new Uint8Array(proof.value)).lastIndexOf(
            proof.storageHash.slice(2),
        ) // dodgy af
        console.log(storageRootOffset)
        if (storageRootOffset === -1) {
            throw new Error('Could not find storageRoot in value')
        }
        storageRootOffset = (storageRootOffset - 2) / 2
        return storageRootOffset
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