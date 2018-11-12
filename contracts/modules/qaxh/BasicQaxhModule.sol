pragma solidity 0.4.24;
import "./UtilsQaxhModule.sol";


/// @title BasicQaxhSafe : implement the basic function of a qaxh safe :
///        owner withdrawing money and secure deposits.
/// @author clem
contract BasicQaxhModule is UtilsQaxhModule {

    //TODO handle ERC20 tokens transactions with msg.data
    /// @dev Handles Ether received by the safe. The contract execution will revert if it wasn't
    ///      called by its ModuleManager or if the transaction is not authorized, i.e. It is not
    ///      coming from either the owner of the safe or another Qaxh safe and its amount has
    ///      exceeded the threshold for little transactions.
    /// @param sender The address sending Ether to the safe. Not to be confused with msg.sender().
    /// @param value The amount of Ether sent to the safe.
    function handle(address sender, uint256 value) public {
        if (value != 0) {
            require(msg.sender == address(manager), "Only the Manager can order transactions.");
            require(
                isActive(sender) || value < 5000000000 || qaxhMasterLedger.qaxhSafe(sender),
                "The sender is not authorized to do that deposit."
            );
        }
    }

    /// @dev Handles Ether and ERC20 token transactions emitted by the safe.
    /// @param to The receiver address.
    /// @param amount The amount of the transaction in Weis.
    /// @param token If set to 0, it is an Ether transaction, else it is a token transaction.
    /// @param data Ignored in case of token transaction. Else, the data field of the transaction.
    function sendFromSafe(address to, uint256 amount, bytes data, address token) public filterOwner {
        if (token == 0)
            require(manager.execTransactionFromModule(to, amount, data, Enum.Operation.Call),
                    "Could not execute ether transfer");
        else {
            bytes memory token_transaction = abi.encodeWithSignature("transfer(address,uint256)", to, amount);
            require(manager.execTransactionFromModule(token, 0, token_transaction, Enum.Operation.Call),
                    "Could not execute token transfer");
        }
    }
}
