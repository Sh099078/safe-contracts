pragma solidity 0.4.24;
import "../../QaxhMasterLedger.sol";

/// @title QaxhUtils - A contract that manages the Qaxh platform and QaxhMasterLedger references into a Qaxh Module.
/// @author Clémence Gardelle
/// @author Loup Federico
contract QaxhUtils {

    address qaxh;
    QaxhMasterLedger qaxhMasterLedger;

    /// @dev Setup qaxh and QaxhMasterLedger addresses references upon module creation.
    function setupUtils(address _qaxh, address _ledger) public {
        require(qaxh == address(0), "Qaxh utils setup can only be done once");
        qaxh = _qaxh;
        qaxhMasterLedger = QaxhMasterLedger(_ledger);
    }

    modifier filterQaxh() {
        require(msg.sender == qaxh, "This method can only be called by the qaxh address");
        _;
    }
}
