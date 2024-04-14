# i lost my eth in a boating accident

a sad, short story

## Instructions???

1. Make sure contract address in `scripts/config.ts` is setup correctly
1. Transfer to unspendable address `yarn burn:sepolia`
1. Make sure block number in `scripts/config.ts` is setup correctly
1. Get storage proofs from archive node and generate `Prover.toml` (and calldata) with `yarn get-proof:sepolia`
1. Generate SNARK proofs `cd circuit && nargo prove` (takes 8 mins)
1. Remint with `yarn remint:sepolia`
