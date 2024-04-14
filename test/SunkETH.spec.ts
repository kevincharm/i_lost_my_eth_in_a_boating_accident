import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import {
    SunkETH,
    SunkETH__factory,
    UltraVerifier,
    UltraVerifier__factory,
} from '../typechain-types'
import { ethers } from 'hardhat'
import {
    JsonRpcProvider,
    concat,
    getBytes,
    hexlify,
    parseEther,
    sha256,
    zeroPadValue,
} from 'ethers'
import { RpcGetProofResult } from '../scripts/RpcGetProofResult'
import { getStorageKey } from '../scripts/getStorageKey'
import { BLOCK_NUMBER, CONTRACT_ADDRESS, SECRET_KEY } from '../scripts/config'
import { getBlockHeaderRLP } from '../scripts/rlp'
import toml from 'toml'
import fs from 'node:fs'
import path from 'node:path'
import remintCalldata from '../scripts/remintCalldata.json'
import { expect } from 'chai'

function toNoirBytes32Array(data: `0x${string}` | Uint8Array) {
    return Array.from(getBytes(data)).map((v) =>
        zeroPadValue(`0x${v.toString(16).padStart(2, '0')}`, 32),
    )
}

describe('SunkETH', () => {
    let deployer: SignerWithAddress
    let sunkETH: SunkETH
    let verifier: UltraVerifier
    beforeEach(async () => {
        ;[deployer] = await ethers.getSigners()
        verifier = await new UltraVerifier__factory(deployer)
            .deploy()
            .then((tx) => tx.waitForDeployment())
        sunkETH = await new SunkETH__factory(deployer).deploy(await verifier.getAddress())
        // sunkETH = SunkETH__factory.connect(CONTRACT_ADDRESS, deployer)
    })

    it('verifies', async () => {
        const block = await ethers.provider.send('eth_getBlockByNumber', [
            `0x${BLOCK_NUMBER.toString(16)}`,
            false,
        ])
        const nullifier = sha256(concat([SECRET_KEY, sha256(SECRET_KEY)]))
        // NB: Run `nargo prove` first
        const snarkProof =
            '0x' +
            fs
                .readFileSync(path.resolve(__dirname, '../circuit/proofs/sunketh_circuit.proof'), {
                    encoding: 'utf-8',
                })
                .trim()
        // const stateProofu8 = getBytes(remintCalldata.stateProof)
        // const stateProof = []
        // for (let i = 0; i < stateProofu8.byteLength; i++) {
        //     stateProof.push(zeroPadValue(`0x${stateProofu8[i].toString(16).padStart(2, '0')}`, 32))
        // }
        const verifierToml = toml.parse(
            fs.readFileSync(path.resolve(__dirname, '../circuit/Verifier.toml'), {
                encoding: 'utf-8',
            }),
        )
        const publicInputsCanon = [
            ...verifierToml.balance,
            ...verifierToml.state_root,
            ...verifierToml.state_proof.key,
            ...verifierToml.state_proof.proof,
            verifierToml.state_proof.depth,
            ...verifierToml.state_proof.value,
            ...verifierToml.storage_root,
            ...verifierToml.return,
        ]
        await verifier.verify(snarkProof, publicInputsCanon)
        // const publicInputsConstructed = [
        //     ...toNoirBytes32Array(
        //         `0x${parseEther('0.001').toString(16).padStart(64, '0')}` /** balance */,
        //     ),
        //     ...toNoirBytes32Array(block.stateRoot),
        //     ...stateProof,
        //     ...toNoirBytes32Array(remintCalldata.storageRoot as `0x${string}`),
        //     ...toNoirBytes32Array(nullifier as `0x${string}`),
        // ]
        // expect(publicInputsConstructed).to.deep.eq(publicInputsCanon)
        // await verifier.verify(snarkProof, publicInputsConstructed)
    })

    it.only('runs happy path', async () => {
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
        // const verifierToml = toml.parse(
        //     fs.readFileSync(path.resolve(__dirname, '../circuit/Verifier.toml'), {
        //         encoding: 'utf-8',
        //     }),
        // )
        // const publicInputsCanon = [
        //     ...verifierToml.balance,
        //     ...verifierToml.state_root,
        //     ...verifierToml.state_proof.key,
        //     ...verifierToml.state_proof.proof,
        //     verifierToml.state_proof.depth,
        //     ...verifierToml.state_proof.value,
        //     ...verifierToml.storage_root,
        //     ...verifierToml.return,
        // ]
        // fs.writeFileSync(
        //     path.resolve(__dirname, './public_inputs_canon.json'),
        //     JSON.stringify(publicInputsCanon, null, 2),
        //     {
        //         encoding: 'utf-8',
        //     },
        // )
        // const erc20Balance = 69420001000000000000000n
        // const publicInputsContract = await sunkETH.toPublicInputs(
        //     erc20Balance,
        //     block.stateRoot,
        //     nullifier,
        //     remintCalldata.storageRootOffset,
        //     remintCalldata.stateProof,
        // )
        // fs.writeFileSync(
        //     path.resolve(__dirname, './public_inputs_contract.json'),
        //     JSON.stringify(publicInputsContract, null, 2),
        //     {
        //         encoding: 'utf-8',
        //     },
        // )
        await sunkETH.remint(
            remintCalldata.balance,
            nullifier,
            remintCalldata.storageRootOffset,
            remintCalldata.stateProof,
            blockHeaderRLP,
            snarkProof,
        )
    })
})
