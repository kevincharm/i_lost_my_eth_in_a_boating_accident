use dep::std;
use dep::noir_trie_proofs::const::{MAX_ACCOUNT_STATE_LENGTH, MAX_STORAGE_VALUE_LENGTH, MAX_TRIE_NODE_LENGTH};
use dep::noir_trie_proofs::storage_proof::StorageProof;
use dep::noir_trie_proofs::trie_proof::TrieProof;
use dep::noir_trie_proofs::{rlp, rlp::RLP_List};

global DEPTH8_MAX: Field = 4256;

fn main(
    s: [u8; 32],
    balance: pub [u8; 32],
    state_root: pub [u8; 32],
    state_proof: TrieProof<20, DEPTH8_MAX, MAX_ACCOUNT_STATE_LENGTH>,
    storage_root: pub [u8; 32],
    storage_proof: TrieProof<32, DEPTH8_MAX, MAX_STORAGE_VALUE_LENGTH>
) -> pub [u8; 32] {
    // A_u = H_2(s)
    let unspendable_address = std::hash::sha256(s);
    // Assert we're proving the correct storage slot for A_u's ERC20 balance
    let mut storage_slot_preimage = [0 as u8; 64];
    for i in 0..20 {
        storage_slot_preimage[12 + i] = unspendable_address[12 + i];
    }
    let storage_key: [u8; 32] = std::hash::keccak256(storage_slot_preimage, 64);
    for i in 0..20 {
        assert(storage_key[i] == storage_proof.key[i], "Storage key mismatch");
    }
    // Assert we're proving the correct balance value
    for i in 0..32 {
        assert(balance[i] == storage_proof.value[i], "Balance mismatch");
    }

    // Verify state proof (i.e. contract account exists with storage root)
    let is_state_valid = state_proof.verify_state_root(state_root);
    assert(is_state_valid, "invalid state proof");
    // Verify storage proof (i.e. A_u's ERC-20 balance is correct)
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
