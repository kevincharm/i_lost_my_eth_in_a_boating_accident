use dep::std;
use dep::noir_trie_proofs::const::MAX_ACCOUNT_STATE_LENGTH;
use dep::noir_trie_proofs::storage_proof::StorageProof;
use dep::noir_trie_proofs::trie_proof::TrieProof;

global DEPTH8_MAX: Field = 4256;

fn main(
    s: [u8; 32],
    state_root: pub [u8; 32],
    state_proof: TrieProof<20, DEPTH8_MAX, MAX_ACCOUNT_STATE_LENGTH>,
    storage_root: [u8; 32],
    storage_proof: StorageProof<DEPTH8_MAX>
) -> pub [u8; 32] {
    let unspendable_address = std::hash::sha256(s);

    let is_state_valid = state_proof.verify_state_root(state_root);
    assert(is_state_valid, "invalid state proof");
    let is_storage_valid = storage_proof.verify_storage_root(storage_root);
    assert(is_storage_valid, "invalid storage proof");

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
