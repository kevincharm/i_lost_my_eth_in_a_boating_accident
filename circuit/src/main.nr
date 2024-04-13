use dep::std;
use dep::noir_trie_proofs::const::{MAX_ACCOUNT_STATE_LENGTH, MAX_STORAGE_VALUE_LENGTH, MAX_TRIE_NODE_LENGTH};
use dep::noir_trie_proofs::storage_proof::StorageProof;
use dep::noir_trie_proofs::trie_proof::TrieProof;
use dep::noir_trie_proofs::{rlp, rlp::RLP_List};

global DEPTH8_MAX: Field = 4256;

fn main(
    s: [u8; 32],
    state_root: pub [u8; 32],
    state_proof: TrieProof<20, DEPTH8_MAX, MAX_ACCOUNT_STATE_LENGTH>,
    storage_root: [u8; 32],
    storage_proof: TrieProof<32, DEPTH8_MAX, MAX_STORAGE_VALUE_LENGTH>
) -> pub [u8; 32] {
    let unspendable_address = std::hash::sha256(s);
    let mut storage_slot_preimage = [0 as u8; 64];
    for i in 0..20 {
        storage_slot_preimage[12 + i] = unspendable_address[12 + i];
    }
    let storage_key: [u8; 32] = std::hash::keccak256(storage_slot_preimage, 64);
    for i in 0..20 {
        assert(storage_key[i] == storage_proof.key[i], "Storage key mismatch");
    }

    let is_state_valid = state_proof.verify_state_root(state_root);
    assert(is_state_valid, "invalid state proof");
    let is_storage_valid = storage_proof.verify_storage_root(storage_root);
    assert(is_storage_valid, "invalid storage proof");

    // Get the index of where the last proof node starts at
    let l = MAX_TRIE_NODE_LENGTH * (state_proof.depth - 1);
    // Copy the last proof node into account_leaf
    let mut account_leaf = [0 as u8; MAX_TRIE_NODE_LENGTH];
    for i in 0..MAX_TRIE_NODE_LENGTH {
        account_leaf[i] = state_proof.proof[l + i];
    }
    let account_leaf_rlp: RLP_List<2> = rlp::decode1(account_leaf);
    let mut account_state = [0 as u8; MAX_TRIE_NODE_LENGTH];
    for i in 0..MAX_TRIE_NODE_LENGTH {
        if (i < account_leaf_rlp.length[1]) {
            account_state[i] = account_leaf[account_leaf_rlp.offset[1]];
        }
    }
    // TODO: Fix dis
    // let account_state_rlp: RLP_List<4> = rlp::decode1(account_state);
    // let storage_root_len = account_state_rlp.length[2];
    // assert(storage_root_len == 32, "Invalid storage root length");
    // for i in 0..32 {
    //     assert(storage_root[i] == account_state[account_state_rlp.offset[2] + i], "Storage root mismatch");
    // }

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
