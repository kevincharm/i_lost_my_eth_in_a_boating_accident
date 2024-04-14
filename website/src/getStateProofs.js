import { ethers } from "ethers"
import { getStorageKey } from '../../scripts/getStorageKey'
import {processProof } from '../../scripts/processProof'



const providerUrl = "https://sepolia.drpc.org"
const provider = new ethers.JsonRpcProvider(providerUrl);


const BLOCK_NUMBER = 5689270

const MAX_DEPTH = 8
const MAX_TRIE_NODE_LENGTH = 532
const MAX_ACCOUNT_STATE_LENGTH = 134
const MAX_STORAGE_VALUE_LENGTH = 32

export async function getStateProofs(burnAddress,provider=provider, contract_address='0x36090F95c63114A172973Af47653B7946315cc06') {
    const storage_key = getStorageKey(0n, ethers.getAddress(burnAddress))

    // const { number: blockNumber } = await provider.getBlock('latest').then((block) => block!)
    const block = await provider.send('eth_getBlockByNumber', [
        `0x${BLOCK_NUMBER.toString(16)}`,
        false,
    ])
    // console.log('Block')
    // console.log(block)
    // console.log('===\n')

    const storageValue = await provider.getStorage(contract_address, storage_key)
    // console.log('Storage value')
    // console.log(storageValue)
    // console.log('===\n')

    const proof = await provider.send('eth_getProof', [
        contract_address,
        [storage_key],
        block.number,
    ])
    // console.log('Proof')
    // console.log(JSON.stringify(proof, null, 2))
    // console.log('===\n')

    /// STATE /////////////////////////////////////////////////////////////////
    // RLP-decode last node of accountProof
    const accountStateRlp = ethers.decodeRlp(proof.accountProof.slice(-1)[0])
    const accountStateValue = ethers.getBytes(accountStateRlp[1])

    // Process state proof
    const processedStateProof = processProof(
        proof.accountProof,
        proof.address,
        accountStateValue,
        MAX_DEPTH,
        MAX_TRIE_NODE_LENGTH,
        MAX_ACCOUNT_STATE_LENGTH,
    )

    /// STORAGE ///////////////////////////////////////////////////////////////
    const processedStorageProof = processProof(
        proof.storageProof[0].proof,
        proof.storageProof[0].key,
        proof.storageProof[0].value,
        MAX_DEPTH,
        MAX_TRIE_NODE_LENGTH,
        MAX_STORAGE_VALUE_LENGTH,
    )
    const data = {
        "state": {
            'state_root': Array.from(ethers.getBytes(block.stateRoot)),
            'state_proof': processedStateProof
        },
        "storage" : {
            'storage_root':ethers.getBytes(proof.storageHash),
            'storage_proof':processedStorageProof,

        }
    }
    return data
}

//console.log(await getStateProofs("0x97248C0ddC583537a824A7ad5Ee92D5f4525bcAa","0x36090F95c63114A172973Af47653B7946315cc06"))