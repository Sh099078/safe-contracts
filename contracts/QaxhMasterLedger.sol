pragma solidity 0.4.24;

/// @title blabla
/// @author clem
contract QaxhMasterLedger {

    address qaxh;

    mapping (address => bool) private isQaxhSafe;

    constructor(address _qaxh) public {
        qaxh = _qaxh;
    }

    modifier filterQaxh {
        require( msg.sender == qaxh );
        _;
    }

    // Should be called when creating a qaxh safe
    function addSafe(address safe) public filterQaxh returns (bool success) {
        isQaxhSafe[safe] = true;
        return isQaxhSafe[safe];
    }

    function removeSafe(address safe) public filterQaxh returns (bool success) {
        isQaxhSafe[safe] = false;
        return !(isQaxhSafe[safe]);
    }

    function qaxhSafe(address safe) public view returns (bool answer) {
        return isQaxhSafe[safe];
    }
}
