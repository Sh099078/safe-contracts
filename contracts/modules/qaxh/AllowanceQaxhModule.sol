pragma solidity 0.4.24;
import "./QaxhModule.sol";


/// @title AllowanceQaxhSafe - A QaxhModule extension that handles debits between Qaxh Safes.
/// @author Clémence Gardelle
/// @author Loup Federico
contract AllowanceQaxhModule is QaxhModule {

    // Qaxh safe => Token address => Allowance of the safe for that token
    mapping (address => mapping (address => uint256)) internal allowances;

    function getAllowance(address user, address token) public view returns (uint256) {
        return allowances[user][token];
    }

    // QAXH SAFES API

    /// @dev Transfer ERC20 tokens at the demand of another Qaxh safe (msg.sender).
    /// @param to Destination address of the tokens.
    /// @param amount Amount of tokens to send.
    /// @param token Deployment address of the ERC20 token.
    function transferFrom(address to, uint256 amount, address token) public {
        require(amount <= allowances[msg.sender][token]);
        allowances[msg.sender][token] -= amount;
        bytes memory data = abi.encodeWithSignature("transfer(address,uint256)", to, amount);
        require(manager.execTransactionFromModule(token, 0, data, Enum.Operation.Call), "transferFrom: Could not execute token transfer");
    }

    // APPINVENTOR API

    /// @dev Set the allowance of another QaxhSafe for a given ERC20 Token.
    /// @param user The other Qaxh Safe that will benefit the allowance.
    /// @param allowance The amount of the allowance.
    /// @param token The address of the ERC20 Token.
    function approve(address user, uint256 allowance, address token) public filterAndRefundOwner(false, false) {
        require(QaxhMasterLedger(qaxhMasterLedger).isQaxhSafe(user));
        allowances[user][token] = allowance;
    }

    /// @dev Ask another Safe to transfer tokens using the owner's Qaxh safe allowance.
    /// @param sender The Qaxh safe that is asked to send tokens.
    /// @param to Destination address of the tokens.
    /// @param amount Amount of tokens to be sent.
    /// @param token Deployment address of the ERC20 token.
    function askTransferFrom(ModuleManager sender, address to, uint256 amount, address token) public filterAndRefundOwner(false, false) {
        address sender_qaxh_module = sender.getModules()[0];
        bytes memory data = abi.encodeWithSignature("transferFrom(address,uint256,address)", to, amount, token);
        require(manager.execTransactionFromModule(sender_qaxh_module, 0, data, Enum.Operation.Call), "askTransferFrom: transferFrom call failed");
    }
}
