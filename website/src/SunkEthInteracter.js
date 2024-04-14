import { ethers } from 'ethers'
import sunkETHABI from "../../exported/abi/SunkETH.json"  assert { type: 'json' };
//const sunkETHABI = sunkETHForgeOut.abi
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { Noir } from '@noir-lang/noir_js';
// import {getStateProofs} from "./getStateProofs"
import {getBlockWithRLP} from './rlp.js'

import { getStorageKey } from '../../scripts/getStorageKey'
import { toUnspendableAddress } from '../../scripts/toUnspendableAddress'

//TODO replace with the real circuit
import circuit from "../../circuit/target/sunketh_circuit.json"
// import { c } from 'vite/dist/node/types.d-aGj9QkWt';

// const STORAGE_KEY = getStorageKey(0n, '0x97248C0ddC583537a824A7ad5Ee92D5f4525bcAa')
export const MAX_DEPTH = 8
export const MAX_TRIE_NODE_LENGTH = 532
export const MAX_ACCOUNT_STATE_LENGTH = 134
export const MAX_STORAGE_VALUE_LENGTH = 32

const snarkProof = "0x2aadde2ac1786695ab009761b6e953f77a008ee91c0dc0181bd9b9a5c5fb77580cbe9d218617fb5f5b30ceb780fb90d12bf12ca8359ffee96e4a96e8e50a8fb51c553e43946c82c1d342be6140fa5fe67cd30d5c60bdffa341910aba7d967e4901081a7e829cc865025b633e2bf4393a42f268309e155625a8373832ceb307bc2446e6a5034c33e6e52d784c786431e556069d1daf6ae15bb141910a6d596a161cb68446776d54c54337739121816f34c54a311e167f8f0579ff59af8d642cd228b8e6c7082c6be26277df19b1ed61e8db9bad37314c535c012e79f931294ac72e60db27c0051642b8bd29cf80b040dd179e71c84e5e9b7fce5c2ceccd23a98a095f0d1733dbec39d81077998c3f364a88326ad72e5cbf0098bd7e29fe2f1c0418e4865dda36e04a034b3da7eb9c80535a990d02228761cbe9ca4bbb2faa522a2321e913aae2739ddf60744c503f2c565e187cab7ba86e5710afafc186b32b9b28450698721219bf2dd54d75f5d142b043d95c77b1502a6b35274af3d26fdcc21e7debfef9a8e9efcee8d03fbbd565432c5497aef0e2354fe091b284e5d7faaa22c97f6763df55dd29a7695aaa808c7a05cb076cf77ea527c5aaf38bf44b242b0190afdf5e0c842e68ac40d1ceeb18d1a935b628b6a918a231778222d263bd002ad2719b3bb9e6c8d1d9543bd66850a055614f53966cecf051b1757d65ab91231156c077f18b4b25be0f33358ea6b12477acb631cb9b62ffd2636125790f6e3b060a2b86486477053a7d6178bff26e512aa32b2fc9f5c32a19dc3819784669642b0f164651e53202edd3333908809150a436bb31d5811ecc6fb5835209c3da290ac8f37735fbcd2f4b29a84b1d0a3dbddf7771f0b4b9c94bf9e7549138fcfd2f039a44f0c51fbb0d3c228b22a75a32b64fe382bb9555ca8d124fbc46ba8787c8067bf57fe60a8bef0032258aec6f7ee21965b0536da2acb498497d8f8b10bf4f08749c88b89814433d950fa44a703a59b9c333c10d2d8006b0e91a1127a78d9f0e964efaf454785e681ae71e42d7107c95de582ec0b164da89e5750ce17ff7e218b238fe91e3d506efa8bdd28ee6fe4487dcad3b20c5a3a1299f672a14bc4e960e9873ef07b9f8a2265461295ffcdd9a5a9fd45784782cc73b3db3e4fdfa9c0422b31c72a035805abad5389a7e04b4bf92b34a46e162dcedd630909b7c4106950d9bce988785e282b0aa1ff7cbd4f455b3118ee3ea569c4acbd9d775a74ecfa81e91f6f705c6b4277b28afad13e2970cc3c0f7a06317a643076398f0ac6768ac2a7d472630be405b2359c655e696001a5b2e4101de37416174b142295a7b9f1b12d118332f9ea2fdfd434af77ebdf494c341fc4628698329ff88d27cde58fdb128cac7ad23962d943e4564ec777ac30979a3069e1b9d5a3f2e6bb41490474d6a2701f9894cd54dc60d368a910177242abc7d88e3eba95fef7e45940ab71c4d1d06b2e7ee62eff311d43d2534930acd350c4e4ec77dc5445ea0df7d7cfe4b991f028a387668d4bf95148f37906ae39d934832257852ae3db8deac993c77c528142d21681b78727f105c819bd24d19b9d2cec45ef5c72b96c520fbf47044fb16dd2161c35fc10b12d1534e8de57e3213d3818b5d411962965ab26cce46880e53e015c9181ba6c00f959ca0f209be5d91f46c7b5ed56d2e5ccb14426a84e4d40a5e02f5c7d22297c61ca99e90afbb162fb0aeb463b30124b41b31a91fb0e29b7ea705000be39c8fe2e5bbb59bbe65831edded78446d734ae8bf11ad22223443ffc2093c7316b023a35dcaf41ef1e7762fb7755abc8b14995feb040fe50c85843ac22075fede8e9abea7a6b91f669a4bc1839713e3eb6e5316a3caafbf8c323229be129c36a771f9f95c63ddc944cd18a22f034195d8a5242db61bb658f3c244212f137c0b1eeb94340b6a75d4d6d6f856ccc416045971533e4e7b0a56c17cf0e5ff24838f119ba1833bca2ac10e5acfb2f943f0d253d97b3df1df1247f0a4b4abf3288d3078e9774e028c48ab0c8264ab248d35ee15a214ee63b275a4440c58e5662c7488eb7bfeff03113266561e0e4d6217e8b122c180c7680a409004fcc36a4d2f38cb452bb979ba16bf78b1da1195b2f53ef3a39154e204c93184dff967223c27938aedf76ddb2d8c7c0d232d08bd8f8a77176807f430a34be4c9dba5e4964c0d436415139b8eb218269ef2367ec02f0971f3cb0c51ce8900a54d34ef76532f09a3acf0fc4ae1b6d7ff5e3535adbc355e547b866b480a86dc501251d1117f4e092efb5b96547e45d86be0929fdbaa14bc9dbec0e047626e9cb461167c41855308ad587e98012647caf8d39024a197b5c4ef944ed662d0b8651561b46a4c606b0d486ce593b102ad3bc09d9aebdfeef7f233da9ae3c641ef533ff1ed088938c51f40ad99206e471e75626348a3012418faa705838656875529337eb1e17b760230188a7cc7b5c640d8683f3e3bb8854a9c13be48335baaebb36fbf07fbdc145d07f4651570d70abc3fec83ec0fdb72339b1e7fde1ccffb6c5462479ca156df921ab63da2e5a27ebb2496043a9938f59a20531493425ee81ac57529fb0b8a0ad326b03b6b1a9488144f77191344c64b1d4b0f5d45a40c3d0e07642862b4b449350d9060f4fb0a7329a26924f5d57725c4f4cc8a2fcc9e15aabf08c066626458c81a7ee3cb8116667a4481690a54b7b071be1f81dd09e4505a1a7c16632e76271b146c507d9ebe0a3df8ea23ef8111f693cbd77958130e67dcaf0540eb475e6a9e22041767e31596e842516e9bb2f2ba215f3d89d7eb12a45246dfbb14b5a63be100f59da022c47f348656166c561f3089ff414c1fc283f69111203493fda39262215ddb3215afce7c50cea044dc2d576d8f257f4a4db22a47c6fda69c14629c140ba59e1ffe3a97cc0728a4d2a00fb3935acc95b78fa39fcf82e565237fc1b48002146b46105725eabc55cdef8482824503d12c9d89feb0fde2c90c4b7bd946d8"
window.snarkProof = snarkProof
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
        const burnAddress = toUnspendableAddress(secret)//ethers.sha256(secret).slice(0, -24)
        const burnAddressBytes = ethers.toBeArray(burnAddress)
        //const concatBytes = ethers.sha256(ethers.concat([secret, ethers.sha256(secret)])) //new Uint8Array([...secret, ...burnAddressBytes])
        const nullifier = ethers.sha256(ethers.concat([secret, ethers.sha256(secret)]))
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

    static makeValuesIntoNumbers(obj) {
        return Object.fromEntries(Object.entries(obj).map((x)=>{
            console.log(x[1])
            if (typeof(x[1]) === "string" && x[1].startsWith("0x")) {
                //return [x[0], BigInt(x[1]).toString()]

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

    async unShieldTokens(nullifierData) {
        //const storageProof = await getStateProofs(burnAddress, this.provider)
        
        //console.log(blockHeaderRLP)
        //console.log("real blockhash: ", block.hash)
        //console.log("rlp reconstructec blockhash: ", ethers.keccak256(ethers.toBeArray(blockHeaderRLP)))



        //const SECRET_KEY = ethers.hexlify(nullifierData.secret) //'0xbc005f65414869c630b7ae67836847f46f9083a9cd84af3f01969031309e5c1d'
        //const BLOCK_NUMBER = (await this.provider.getBlock()).number
        // const CONTRACT_ADDRESS =   this.sunkEthContract.target //'0x46CFe55bf2E5A02B738f5BBdc1bDEE9Dd22b5d39'
        // const UNSPENDABLE_ADDRESS = toUnspendableAddress(SECRET_KEY)
        // //const BALANCE_TO_BURN = parseEther('0.069420')
        // const STORAGE_KEY = getStorageKey(0n, UNSPENDABLE_ADDRESS)


        // const unspendable_address = nullifierData.burnAddressBytes;
        // const pubNullifier = nullifierData.nullifierBytes; 
        // const s = nullifierData.secret;
        // const input = {s:Array.from(s),unspendable_address:Array.from(unspendable_address),pubNullifier:Array.from(pubNullifier)}
        // console.log(input)
        // console.log("circuit: ", circuit)
        // const proof = await noir.generateProof(input);
        // console.log("proof: ", proof)
        // console.log ("is verified (local): ",await noir.verifyProof(proof))
        // console.log(nullifierData)
        // console.warn("TODO implement")

        // // uint256 wad,
        // // bytes32 nullifier,
        // // bytes calldata blockHeaderRLP,
        // // bytes calldata snarkProof
        // const amount = await this.sunkEthContract.balanceOf(burnAddress)
        // console.log("args: ", {amount, pubNullifier, blockHeaderRLP, proof:proof.proof})
        // //console.log("args arr: ", JSON.stringify(amount, pubNullifier, blockHeaderRLP, proof.proof))
        // console.log(amount, ethers.hexlify(pubNullifier), blockHeaderRLP,ethers.hexlify( proof.proof))
        const CONTRACT_ADDRESS =   this.sunkEthContract.target //'0x46CFe55bf2E5A02B738f5BBdc1bDEE9Dd22b5d39'
        const SECRET_KEY = ethers.hexlify(nullifierData.secret)
        const UNSPENDABLE_ADDRESS = toUnspendableAddress(SECRET_KEY)
        const STORAGE_KEY = getStorageKey(0n, UNSPENDABLE_ADDRESS)
        
        const nullifier = ethers.sha256(ethers.concat([SECRET_KEY, ethers.sha256(SECRET_KEY)]))

        const BLOCK_NUMBER = (await this.provider.getBlock()).number
        const block = await this.provider.send('eth_getBlockByNumber', [
            `0x${BLOCK_NUMBER.toString(16)}`,
            false,
        ])
        const blockHeaderRLP = await getBlockWithRLP(block.hash, this.provider)

        const proof = await this.provider.send('eth_getProof', [
            CONTRACT_ADDRESS,
            [STORAGE_KEY],
            block.number,
        ])

        const accountStateRlp = ethers.decodeRlp(proof.accountProof.slice(-1)[0])
        const accountStateValue = ethers.getBytes(accountStateRlp[1]) // NB: also RLP-encoded

        const processedStateProof = processProof(
            proof.accountProof,
            proof.address,
            accountStateValue,
            MAX_DEPTH,
            MAX_TRIE_NODE_LENGTH,
            MAX_ACCOUNT_STATE_LENGTH,
        )

        const processedStorageProof = processProof(
            proof.storageProof[0].proof,
            proof.storageProof[0].key,
            proof.storageProof[0].value,
            MAX_DEPTH,
            MAX_TRIE_NODE_LENGTH,
            MAX_STORAGE_VALUE_LENGTH,
        )
        let storageRootOffset = ethers.hexlify(new Uint8Array(processedStateProof.value)).lastIndexOf(
            proof.storageHash.slice(2),
        ) // dodgy af
        if (storageRootOffset === -1) {
            throw new Error('Could not find storageRoot in value')
        }
        storageRootOffset = (storageRootOffset - 2) / 2

        const remintCalldata = {
            balance: ethers.zeroPadValue(ethers.hexlify(new Uint8Array(processedStorageProof.value)), 32),
            storageRootOffset,
            stateProof: {
                key: ethers.hexlify(new Uint8Array(processedStateProof.key)),
                proof: ethers.hexlify(new Uint8Array(processedStateProof.proof)),
                depth: processedStateProof.depth,
                value: ethers.hexlify(new Uint8Array(processedStateProof.value)),
            },
            storageRoot: proof.storageHash,
        }

        await SunkEthInteracter.setupWasm()
        const backend = new BarretenbergBackend(circuit);
        const noir = new Noir(circuit, backend);

        const inputPlain = {
            s:(SECRET_KEY), 
            balance:(remintCalldata.balance), 
            state_root: (block.stateRoot),
            state_proof: (remintCalldata.stateProof),
            storage_root: (remintCalldata.storageRoot), 
            storage_proof: (remintCalldata.stateProof)
            

        }
        console.log(inputPlain)

        
        // const input = {
        //     s: BigInt(SECRET_KEY).toString(), 
        //     balance: BigInt(remintCalldata.balance).toString(), 
        //     state_root: BigInt(block.stateRoot).toString(),
        //     state_proof: SunkEthInteracter.makeValuesIntoNumbers(remintCalldata.stateProof),
        //     storage_root:   BigInt(remintCalldata.storageRoot).toString(), 
        //     storage_proof:  SunkEthInteracter.makeValuesIntoNumbers(remintCalldata.stateProof)
            

        // }
        // console.log(input)
        //const snarkProof = await noir.generateProof(input);
        //const snarkProof = JSON.stringify(document.getElementById("proof").value)
        console.log({
            balance:remintCalldata.balance,
            nullifier,
            storageRootOffset: remintCalldata.storageRootOffset,
            stateProof: remintCalldata.storageRootOffset,
            stateProof: remintCalldata.stateProof,
            snarkProof: snarkProof.toString()
        })
        const tx = await this.sunkEthContractWithSigner.remint(
            remintCalldata.balance,
            nullifier,
            remintCalldata.storageRootOffset,
            remintCalldata.stateProof,
            blockHeaderRLP,
            ethers.toBeArray(snarkProof),
        )
        //const tx = await this.sunkEthContractWithSigner.remint(amount, ethers.hexlify(pubNullifier), blockHeaderRLP,ethers.hexlify( proof.proof))
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