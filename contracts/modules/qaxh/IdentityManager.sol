pragma solidity 0.4.24;

/// @title IdentityManager- A contract that handles identity certification for the QaxhModule
/// @author Loup Federico
contract IdentityManager {
    string public QI_hash;
    string public QE_hash;
    uint8 public eIDAS;
    bool internal alreadySetup;
    // string sub_hash;

    function setupIdentity(string _QI_hash, string _QE_hash, uint8 _eIDAS) internal isEIDAS(_eIDAS) {
        require(!alreadySetup, "This safe already has a declared identity");
        QI_hash = _QI_hash;
        QE_hash = _QE_hash;
        eIDAS = _eIDAS;
        alreadySetup = true;
    }

    /// @dev Emits an event that proves the validation and approval of the identity contained
    ///      in the contract by the sender of the transaction `tx.origin.
    ///      N.B: This function must remain internal and all required precautions from the QaxhModule
    ///      must be taken outside of it.
    function certifyIdentity() internal {
        emit CertifyIdentity(tx.origin);
    }

    // MODIFIERS

    /// @dev Return true if the indicated eIDAS is valid.
    modifier isEIDAS(uint8 _eIDAS) {
        //require(_eIDAS != 0 && _eIDAS <= 3, "Invalid eIDAS");
        _;
    }

    event CertifyIdentity(address certifier);
}
