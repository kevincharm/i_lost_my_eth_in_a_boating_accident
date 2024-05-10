# i lost my eth in a boating accident

a sad, short story

## requirements
The circuit requires more then 40gb in ram to prove. Expanding swap size can work.
sudo npm install -g nodemon
run endpoint: `nodemon website/nargoProveEndPoint.js `
run website: `cd website; yarn run dev`

## Instructions???

1. Make sure contract address in `scripts/config.ts` is setup correctly
1. Transfer to unspendable address `yarn burn:sepolia`
1. Make sure block number in `scripts/config.ts` is setup correctly
1. Get storage proofs from archive node and generate `Prover.toml` (and calldata) with `yarn get-proof:sepolia`
1. Generate SNARK proofs `cd circuit && nargo prove` (takes 8 mins)
1. Remint with `yarn remint:sepolia`
