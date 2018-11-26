pragma solidity 0.4.24;

/// @title A smart contract owned by the Qaxh address keeps track of every Qaxh certified Gnosis Safe and of their owners.
/// @author Clémence Gardelle
/// @author Loup Federico
contract QaxhMasterLedger {

    address public qaxh;

    // Maps the hashed identity of a Qaxh user to its Qaxh certified Gnosis Safe.
    mapping (bytes32 => address) public qaxhOwners;

    // True means that the given address is a Qaxh certified Gnosis Safe.
    mapping (address => bool) public qaxhSafe;

    constructor() public {
        qaxh = tx.origin;
    }

    /// @dev Add a new Qaxh identified owner and its Safe to the contract.
    /// @param id_hash Hash of the user id (FranceConnect sub).
    /// @param safe Address of the Gnosis Safe to be associated with the new user.
    function addSafe(bytes32 id_hash, address safe) public filterQaxh {
        require(qaxhOwners[id_hash] == address(0), "This person already owns a Qaxh Safe");
        qaxhOwners[id_hash] = safe;
        qaxhSafe[safe] = true;
    }

    /// @dev Delete a user and its safe from the Qaxh certified Gnosis safes record.
    /// @dev safe The address of the safe to be deleted.
    //function removeSafe(address safe) public filterQaxh {
    //   qaxhSafeOwners[id_hash] = address(0);
    //}

    /// @dev Delete a user and its safe from the Qaxh certified Gnosis safes record.
    /// @param id_hash Hashed id of the owner to be deleted.
    function removeSafe(bytes32 id_hash) public filterQaxh {
        qaxhSafe[qaxhOwners[id_hash]] = false;
        qaxhOwners[id_hash] = address(0);
    }

    /// @dev Return the address of the Qaxh certified Gnosis Safe corresponding a given owner.
    /// @param id_hash Hashed id of the owner to be deleted.
    function getQaxhSafe(bytes32 id_hash) public view returns(address) {
        return qaxhOwners[id_hash];
    }

    /// @dev Return true if the address given in parameters corresponds to a Qaxh certified Gnosis Safe.
function isQaxhSafe(address safe) public view returns (bool) {
    return qaxhSafe[safe];
    }

    modifier filterQaxh {
        require( msg.sender == qaxh );
        _;
    }
}
