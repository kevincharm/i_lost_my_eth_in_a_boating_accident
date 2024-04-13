use dep::std;

fn main(s: [u8; 32], unspendable_address: [u8; 20], pubNullifier: pub [u8; 32]) {
    // Compute a nullifier for use in contract
    let mut nullifier_preimage: [u8; 52] = [0; 52];
    for i in 0..52 {
        if i < 32 {
            nullifier_preimage[i] = s[i];
        } else {
            nullifier_preimage[i] = unspendable_address[i-32];
        }
    }
    // Use a HMAC construction for the nullifier
    // nullifier = H(s || H(s))
    let nullifier = std::hash::sha256(nullifier_preimage);
    assert(pubNullifier == nullifier);
}

#[test]
fn test_main() {
    let s = [223, 2, 3, 64, 160, 235, 45, 12, 98, 202, 111, 134, 57, 86, 76, 30, 208, 94, 40, 196, 212, 31, 56, 207, 174, 228, 240, 24, 98, 250, 227, 179];
    let unspendable_address = [122, 211, 109, 126, 143, 7, 99, 63, 216, 180, 141, 219, 51, 75, 63, 89, 76, 125, 100, 202];
    let nullifier = [209, 253, 76, 152, 195, 228, 5, 78, 51, 129, 141, 114, 117, 105, 76, 104, 129, 124, 230, 218, 198, 254, 120, 129, 41, 245, 173, 29, 70, 250, 211, 138];

    main(s, unspendable_address, nullifier);

    // Uncomment to make test fail
    // main(1, 1);
}
