export type ByteString = `0x${string}`

export interface RpcGetProofResult {
    address: ByteString
    accountProof: ByteString[]
    balance: ByteString
    codeHash: ByteString
    nonce: ByteString
    /** storage_root */
    storageHash: ByteString
    storageProof: Array<{
        key: ByteString
        value: ByteString
        proof: ByteString[]
    }>
}
