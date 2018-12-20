pragma solidity 0.4.24;

/// @title IdentityManager- A contract that handles identity certification for the QaxhModule
/// @author Loup Federico
contract IdentityManager {
    string public QI_hash;
    string public QE_hash;
    uint8 public identityLevel;
    bool internal alreadySetup;

    function setupIdentity(string _QI_hash, string _QE_hash, uint8 _identityLevel) internal checkIdentityLevel(_identityLevel) {
        require(!alreadySetup, "This safe already has a declared identity");
        QI_hash = _QI_hash;
        QE_hash = _QE_hash;
        identityLevel = _identityLevel;
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

    /// @dev Return true if the indicated identityLevel is valid.
    modifier checkIdentityLevel(uint8 _identityLevel) {
        //TODO Add identityLevel value check once it is clearly defined in the specs
        _;
    }

    event CertifyIdentity(address certifier);
}
