pragma solidity 0.4.24;
import "../../Module.sol";
import "./QaxhUtils.sol";
import "./KeyManager.sol";

/// @title QaxhModule - A contract that allows its associated Gnosis Safe to be Qaxh compliant if owned by the Qaxh address.
/// @author Clémence Gardelle
/// @author Loup Federico
contract QaxhModule is Module, KeyManager {

    /// @dev Setup qaxh and QaxhMasterLedger addresses references upon module creation.
    function setup(address _qaxh, address _ledger) public {
        require(qaxh == address(0), "QaxhModule.setup() can only be called once");
        setupUtils(_qaxh, _ledger);
        setManager();
    }

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
                isActive(sender) || value < 5000000000 || qaxhMasterLedger.qaxhSafe(sender) || sender == qaxh,
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
        emit TransactionFromQaxhModule(to, amount, data, token);
    }

    event TransactionFromQaxhModule(address to, uint256 amount, bytes data, address token);
}
