import express from 'express';
import {promises as fs} from 'fs'  ;
import cors from 'cors';
import {spawn, exec} from 'node:child_process';
import util from 'util'
import { ethers } from 'ethers';
import packageConfig from './package.json' assert { type: 'json' };
const nargoEndPointPort =  packageConfig.config.nargoEndPointPort
const websitePort =  packageConfig.config.websitePort
import {dirname } from "node:path";

const __dirname = dirname(process.argv[1]);

export function toHexArrayString(arr) {
    return `[\n${arr.map((v) => `    0x${v.toString(16).padStart(2, '0')}`).join(',\n')}\n]`
}


export function toCombinedNargoProverToml(
    s,
    balance,
    state,
    storage
) { 
    const toml = []
    toml.push(`s = ${toHexArrayString(s)}`)
    toml.push(`balance = ${toHexArrayString(balance)}`)
    toml.push(`${state.fieldNames.root} = ${toHexArrayString(state.root)}`)
    toml.push(`${storage.fieldNames.root} = ${toHexArrayString(storage.root)}`)
    // state proof
    toml.push(`\n[${state.fieldNames.proof}]`)
    toml.push(`key = ${toHexArrayString(state.processedProof.key)}`)
    toml.push(`proof = ${toHexArrayString(state.processedProof.proof)}`)
    toml.push(`depth = 0x${state.processedProof.depth.toString(16).padStart(2, '0')}`)
    toml.push(`value = ${toHexArrayString(state.processedProof.value)}`)
    // storage proof
    toml.push(`\n[${storage.fieldNames.proof}]`)
    toml.push(`key = ${toHexArrayString(storage.processedProof.key)}`)
    toml.push(`proof = ${toHexArrayString(storage.processedProof.proof)}`)
    toml.push(`depth = 0x${storage.processedProof.depth.toString(16).padStart(2, '0')}`)
    toml.push(`value = ${toHexArrayString(storage.processedProof.value)}`)
    return toml.concat('\n').join('\n')
}

const api = express()
// enabling CORS for some specific origins only. 
let corsOptions = { 
    origin : [`http://localhost:${websitePort}`], 
 } 
   
api.use(cors(corsOptions))
api.use(express.json())  

const HOST = 'localhost'
const PORT = nargoEndPointPort


api.get('/', (req,res) => {
    res.send('Welcome to this awesome API!')
})

api.post('/prove',async (req,res) => {
    const secret  = req.body.secret
    const balance = req.body.balance
    const stateProof = req.body.stateProof
    const storageProof = req.body.storageProof
    const toml = toCombinedNargoProverToml(secret,balance,stateProof,storageProof)
    await fs.writeFile(__dirname + "/../circuit/Prover.toml", toml)
    const execProm = util.promisify(exec)
    const { stdout, stderr } = await execProm(`cd ${__dirname +"/../circuit"}; nargo prove`);

    const proof = await fs.readFile(__dirname+ "/../circuit/proofs/sunketh_circuit.proof", "utf-8");

    res.status(200).json({proof: "0x" + proof})
})


api.listen(PORT, () => console.log(`API running at ${HOST}:${PORT}!`))