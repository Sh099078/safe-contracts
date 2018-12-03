pragma solidity 0.4.24;
import "../../Module.sol";
import "./IdentityManager.sol";
import "./KeyManager.sol";
import "./QaxhUtils.sol";

/// @title QaxhModule - A contract that allows its associated Gnosis Safe to be Qaxh compliant if owned by the Qaxh address.
/// @author Clémence Gardelle
/// @author Loup Federico
contract QaxhModule is Module, KeyManager, IdentityManager {

    /// @dev Setup qaxh and QaxhMasterLedger addresses references upon module creation.
    function setup(address _qaxh, address _ledger) public {
        require(qaxh == address(0), "QaxhModule.setup() can only be called once");
        setupUtils(_qaxh, _ledger);
        setManager();
        //TODO Add setupIdentity call once the definitive identity fields are accepted
    }

    /// @dev Setup the QaxhModule identity if tx.origin has the appropriate rights.
    function callSetupIdentity(string _QI_hash, string _QE_hash, uint8 _eIDAS) public filterQaxh {
        setupIdentity(_QI_hash, _QE_hash, _eIDAS);
    }

    // AUTHENTICATION PROCESS

    /// @dev If all conditions are met, emit the countersignature event containing the Qaxh client's public key.
    ///      Only an active key can accept the safe identity.
    function acceptIdentity() public filterOwner {
        certifyIdentity();
    }

    // SENDING AND RECEIVING ETHERS AND TOKENS

    /// @dev Handle Ether received by the safe. The contract execution will revert if it wasn't
    ///      called by its ModuleManager or if the transaction is not authorized, i.e. It is not
    ///      coming from either the owner of the safe, another Qaxh safe or the Qaxh address and
    ///      its amount exceeds the little transactions threshold.
    /// @param sender The address sending Ether to the safe. Not to be confused with msg.sender().
    /// @param value The amount of Ether sent to the safe.
    function handle(address sender, uint256 value) public {
        if (value != 0) {
            require(msg.sender == address(manager), "Only the Manager can order transactions.");
            require(
                isActive(sender) || value < 5000000000 || QaxhMasterLedger(qaxhMasterLedger).qaxhSafe(sender) || sender == qaxh,
                "The sender is not authorized to do that deposit."
            );
        }
    }

    /// @dev Ask the GnosisSafe to send Ether or ERC20 tokens and revert on failure.
    /// @param to The receiver address.
    /// @param amount The amount of the transaction in Weis.
    /// @param token If set to 0, it is an Ether transaction, else it is a token transaction.
    /// @param data Ignored in case of token transaction. Else, the data field of the transaction.
    function sendFromSafe(address to, uint256 amount, bytes data, address token) public filterOwner {
        if (token == address(0))
            require(manager.execTransactionFromModule(to, amount, data, Enum.Operation.Call),
                    "Could not execute ether transfer");
        else {
            bytes memory token_transaction = abi.encodeWithSignature("transfer(address,uint256)", to, amount);
            require(manager.execTransactionFromModule(token, 0, token_transaction, Enum.Operation.Call),
                    "Could not execute token transfer");
        }
    }
}
