pragma solidity 0.4.24;
import "../../Module.sol";
import "../../QaxhMasterLedger.sol";

/// @title UtilsQaxhModule : all the little things needed to implement  a qaxh safe
/// @author Clémence Gardelle
/// @author Loup Federico
contract UtilsQaxhModule is Module {

    // STATE VARIABLES

    address internal qaxh;
    QaxhMasterLedger internal qaxhMasterLedger;

    /*
     * keyStatus: Tells for a given address its status.
     * keyList: A linked list that contains all the keys of the safe.
     */

    enum Status { NotAnOwner, Frozen, Active }
    mapping (address => Status) keyStatus;
    mapping (address => address) keyList;
    address constant SENTINEL_KEYS = address(0x1);
    uint8 constant MAX_KEYS = 10;

    // INITIALIZATION FUNCTIONS

    /// @dev Setup function sets manager
    function setup(address _qaxh, address _ledger) public {
        require(qaxh == address(0), "QaxhModule.setup() can only be called once");
        qaxh = _qaxh;
        qaxhMasterLedger = QaxhMasterLedger(_ledger);
        setManager();
    }

    // KEYS MANAGEMENT

    // Activate, freeze and remove keys :

    /// @dev Activate the key given as a parameter. It can be called by:
    ///         1.) Any active key.
    ///         2.) The key itself if its status is `Frozen`.
    ///         3.) The Qaxh address.
    ///      NB: only the Qaxh address can create a new key : the other
    ///      keys are only able to unfreeze frozen keys with this function.
    /// @param _key The key to activate.
    function activateKey(address _key) public {
        require(isValidKey(_key), "Invalid key");
        require(
                keyStatus[msg.sender] == Status.Active ||
                (keyStatus[_key] == Status.Frozen && msg.sender == _key) ||
                msg.sender == qaxh,
                "Emitter not allowed to activate the key"
               );
        if (keyStatus[_key] == Status.NotAnOwner) {
            require(msg.sender == qaxh, "Only Qaxh can add a new key to the safe");
            keyList[_key] = keyList[SENTINEL_KEYS];
            keyList[SENTINEL_KEYS] = _key;
        }
        keyStatus[_key] = Status.Active;
        //assert(this.isInKeyList(_key) == true);
    }

    /// @dev Freeze the key given as a parameter. It can be called by :
    ///         1.) Any active key (including the key to be frozen).
    ///         2.) The Qaxh address.
    /// @param _key The key to freeze.
    function freezeKey(address _key) public {
        require(keyStatus[_key] == Status.Active, "This key is not active");
        require(
                msg.sender == qaxh || keyStatus[msg.sender] == Status.Active,
                "Emitter not allowed to freeze this key"
               );
        keyStatus[_key] = Status.Frozen;
    }

    /// @dev Delete the key given as a parameter from the safe. It can be called by:
    ///         1.) Any active key (including the key to be deleted).
    ///         2.) The Qaxh address.
    /// @param _key The key to delete.
    function removeKey(address _key) public filterQaxh {
        require(
                msg.sender == qaxh || keyStatus[msg.sender] == Status.Active,
                "Emitter not allowed to remove this key"
               );
        require(keyStatus[_key] != Status.NotAnOwner, "The safe doesn't contain this key");

        address prev = SENTINEL_KEYS;
        while (keyList[prev] != _key)
            prev = keyList[prev];
        keyList[prev] = keyList[_key];
        keyList[_key] = address(0);
        keyStatus[_key] = Status.NotAnOwner;
        assert(this.isInKeyList(_key) == false);
    }

    /// @dev Checks wether a key is valid or not, i.e. if it is suitable to
    ///      be added to the QaxhSafe. Any key is valid, except :
    ///         1.) The 0x0 address (for implementation reasons).
    ///         2.) The SENTINEL_KEYS address (for implementation reasons).
    function isValidKey(address _key) internal pure returns (bool) {
        return _key != address(0) && _key != SENTINEL_KEYS;
    }

    // List the safe keys, check for a key status :

    function isActive(address _key) public view returns (bool) {
        return keyStatus[_key] == Status.Active;
    }

    function isFrozen(address _key) public view returns (bool) {
        return keyStatus[_key] == Status.Frozen;
    }

    function isNotAnOwner(address _key) public view returns (bool) {
        return keyStatus[_key] == Status.NotAnOwner;
    }

    /// @dev Returns a list of the keys added to the safe of the selected types.
    ///      NB. This functions returns at most MAX_KEYS even though the safe might have more.
    ///      The reason for that is that at the moment of its implementation you couldn't return
    ///      dynamic arrays in Solidity. If you need to return more keys, increase MAX_KEYS accordingly.
    /// @param active Set it to true to list active keys.
    /// @param frozen Set it to true to list frozen keys.
    function listKeys(bool active, bool frozen) public view returns (address[MAX_KEYS] keys) {
        uint8 index;
        for(address key = keyList[SENTINEL_KEYS]; key != address(0) && index < MAX_KEYS; key = keyList[key]) {
            if ((keyStatus[key] == Status.Frozen && frozen) || (keyStatus[key] == Status.Active && active)) {
                keys[index] = key;
                index++;
            }
        }
        return keys;
    }

    // UTILITY FUNCTIONS

    /// @dev Return true if `key` is present in `keyList`.
    function isInKeyList(address _key) public view returns (bool) {
        address curr = SENTINEL_KEYS;
        while (curr != _key && curr != address(0))
            curr = keyList[curr];
        return curr == _key;
    }

    /// @dev Return the number of elements in the list before the first null address.
    function listLength(address[MAX_KEYS] list) public pure returns (uint256 length) {
        for(length = 0; length < MAX_KEYS && list[length] != address(0); length++)
            continue;
    }

    // MODIFIERS

    modifier filterOwner() {
        require(keyStatus[msg.sender] == Status.Active,
                "This method can only be called by the owner of the safe");
        _;
    }

    modifier filterQaxh() {
        require(msg.sender == qaxh, "This method can only be called by the qaxh address");
        _;
    }

    // GETTERS

    function get_qaxh() public view returns (address) {
        return qaxh;
    }

    function get_qaxhMasterLedger() public view returns(address) {
        return qaxhMasterLedger;
    }
}
