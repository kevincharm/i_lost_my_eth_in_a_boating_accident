use dep::std;
use dep::noir_trie_proofs::const::{MAX_ACCOUNT_STATE_LENGTH, MAX_STORAGE_VALUE_LENGTH};
use dep::noir_trie_proofs::storage_proof::StorageProof;
use dep::noir_trie_proofs::trie_proof::TrieProof;
use dep::noir_trie_proofs::rlp;

global DEPTH8_MAX: Field = 4256;

fn main(
    s: [u8; 32],
    state_root: pub [u8; 32],
    state_proof: TrieProof<20, DEPTH8_MAX, MAX_ACCOUNT_STATE_LENGTH>,
    storage_root: [u8; 32],
    storage_proof: TrieProof<32, DEPTH8_MAX, MAX_STORAGE_VALUE_LENGTH>
) -> pub [u8; 32] {
    let unspendable_address = std::hash::sha256(s);

    let is_state_valid = state_proof.verify_state_root(state_root);
    assert(is_state_valid, "invalid state proof");
    let is_storage_valid = storage_proof.verify_storage_root(storage_root);
    assert(is_storage_valid, "invalid storage proof");

    // TODO: Split state_proof's last element so we can RLP-decode it
    // -> account_state == RLP.decode( RLP.decode(state_proof[-1])[-1] ) == [nonce, balance, storage_root, codehash]
    // -> account_state[2] == storage_root
    // let state_proof_rlp = rlp::decode1(state_proof.proof);
    // let state_leaf_offset = state_proof_rlp.offset[state_proof_rlp.num_fields - 1];
    // let state_leaf_len = state_proof_rlp.length[state_proof_rlp.num_fields - 1];
    // let state_leaf: [u8; 104] = [0; 104];
    // for i in 0..state_leaf_len {
    //     //
    // }
    // assert(state_proof.proof[-1] == rlp(nonce,balance,storage_root,codehash))

    // Compute a nullifier for use in contract
    let mut nullifier_preimage: [u8; 64] = [0; 64];
    for i in 0..64 {
        if i < 32 {
            nullifier_preimage[i] = s[i];
        } else {
            nullifier_preimage[i] = unspendable_address[i-32];
        }
    }
    // Use a HMAC construction for the nullifier
    // nullifier = H(s || H(s))
    let nullifier = std::hash::sha256(nullifier_preimage);
    nullifier
}

#[test]
fn test_main() {
    // main([1345], 1000, storage_root);
    // Uncomment to make test fail
    // main(1, 1);
}
