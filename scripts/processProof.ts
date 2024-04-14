import { BytesLike, getBytes, hexlify, zeroPadBytes, zeroPadValue } from 'ethers'

/// Processed proof ready for input into circuit
export interface ProcessedProof {
    key: number[]
    proof: number[]
    depth: number
    value: number[]
}

// Process the result of eth_getProof into an input for the state/storage proof circuit
// TS impl of:
// https://github.com/aragonzkresearch/noir-trie-proofs/blob/main/src/lib.rs#L153
export function processProof(
    proof: BytesLike[],
    key: BytesLike,
    value: BytesLike,
    max_depth: number,
    max_node_len: number,
    max_value_len: number,
): ProcessedProof {
    const depth = proof.length
    if (depth > max_depth) {
        throw new Error('Depth overflow')
    }

    // Pad with empty nodes
    proof =
        depth < max_depth
            ? [
                  ...proof,
                  ...Array(max_depth - depth)
                      .fill(0)
                      .map((_) => '0x'),
              ]
            : proof
    // Right-pad each element
    const flatPaddedProof = proof
        .map((node) => Array.from(getBytes(zeroPadBytes(node, max_node_len))))
        .flat()

    const paddedValue = zeroPadValue(zeroPadStartBytesLike(value), max_value_len)

    return {
        key: Array.from(getBytes(key)),
        proof: flatPaddedProof,
        depth,
        value: Array.from(getBytes(paddedValue)),
    }
}

export interface ProcessedProofTomlNames {
    root: string
    proof: string
}

// Takes a root & proof and transform it into Prover.toml format for Noir
export function toNargoProverToml(
    root: number[],
    processedProof: ProcessedProof,
    fieldNames: ProcessedProofTomlNames,
) {
    const toml = []
    toml.push(`${fieldNames.root} = ${toHexArrayString(root)}`)
    toml.push(`\n[${fieldNames.proof}]`)
    toml.push(`key = ${toHexArrayString(processedProof.key)}`)
    toml.push(`proof = ${toHexArrayString(processedProof.proof)}`)
    toml.push(`depth = 0x${processedProof.depth.toString(16).padStart(2, '0')}`)
    toml.push(`value = ${toHexArrayString(processedProof.value)}`)
    return toml.concat('\n').join('\n')
}

export function toCombinedNargoProverToml(
    s: number[],
    balance: number[],
    state: {
        root: number[]
        processedProof: ProcessedProof
        fieldNames: ProcessedProofTomlNames
    },
    storage: {
        root: number[]
        processedProof: ProcessedProof
        fieldNames: ProcessedProofTomlNames
    },
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

export function toHexArrayString(arr: number[]) {
    return `[\n${arr.map((v) => `    0x${v.toString(16).padStart(2, '0')}`).join(',\n')}\n]`
}

/// Ensure `data` conforms to BytesLike format expected by ethers
function zeroPadStartBytesLike(data: BytesLike) {
    if (typeof data !== 'string') return data
    if (data.length % 2 == 0) return data
    // odd length -> pad start with 0
    return `0x0${data.slice(2)}`
}
