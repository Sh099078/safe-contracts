pragma solidity 0.4.24;
import "./BasicQaxhModule.sol";


/// @title AllowanceQaxhSafe : extends BasicQaxhModule
///        allow to authorize others user to withdraw from the safe under a spending limit
///        there isn't any time limit or authomated refill of the spending limit
/// @author clem
contract AllowanceQaxhModule is BasicQaxhModule {

    mapping (address => mapping (address => uint256)) internal allowances; //mapping user address to token address to allowances

    // GETTERS AND SETTERS

    function getAllowance(address user, address token) public view returns (uint256) {
        return allowances[user][token];
    }

    /// @dev Set the allowance of another QaxhSafe for a given ERC20 Token.
    /// @param user The other Qaxh Safe that will benefit the allowance.
    /// @param allowance The amount of the allowance.
    /// @param token The address of the ERC20 Token.
    function changeAllowance(address user, uint256 allowance, address token) public filterOwner {
        require(qaxhMasterLedger.qaxhSafe(user));
        allowances[user][token] = allowance;
    }

    // Do not erase this function, it's overwritten in TimedAllowanceQaxhModule.
    function isUnderAllowance(address sender, uint256 amount, address token) internal view returns (bool) {
        return amount <= allowances[sender][token];
    }

    // EMIT, DELEGATE AND RECEIVE TRANSACTIONS

    /// @dev Extern user asking for a transfert : no check is made at this point except verifying
    ///      that if he has enough allowance to withdraw the amount
    ///      only a qaxh safe can ask for funds, so this function shouldn't be called directly by a normal account
    ///      instead, the owner of a qaxh safe should call askTransferFrom() on his own safe.
    function transferFrom(address to, uint256 amount, address token) public {
        require(isUnderAllowance(msg.sender, amount, token));
        allowances[msg.sender][token] -= amount;
        sendByAllowance(to, amount, token);
    }

    /// @dev Make the Gnosis Safe execute a transaction.
    /// @param to The address that will receive the funds.
    /// @param amount The amount of Ether / ERC20 tokens to send.
    /// @param token If set to address(0), send Ethers. Else, send ERC20 tokens from this address.
    function sendByAllowance(address to, uint256 amount, address token) internal {
        // TODO Add something to check if the safe has enougth tokens here so that the transaction reverts
        //      if `amount` is too high. Currently, no money is spend but the gas used is lost.
        if (token == address(0))
            require(manager.execTransactionFromModule(to, amount, "", Enum.Operation.Call), "Could not execute ether transfer");
        else {
            bytes memory data = abi.encodeWithSignature("transfer(address,uint256)", to, amount);
            require(manager.execTransactionFromModule(token, 0, data, Enum.Operation.Call), "Could not execute token transfer");
        }
    }

    /// @dev Called by the owner of this safe to call transferFrom() on the module at address otherModule.
    ///      IDEA : it would maybe be best to pass otherSafe in parameter rather than otherModule,
    ///      and to call the function on otherSafe.getModules()[0] (which must be a qaxh module, if other safe is a qaxh safe)
    function askTransferFrom(
        address otherModule,
        address to,
        uint256 amount,
        address token
    )
        public
        filterOwner
    {
        // Here you have to compute the call data, and execute it from the manager
        // since only qaxh safe can be allowed to withdraw
        // on it's the gnosis safe and not the module which is the safe

        // Compute the call data
        bytes4 selector = bytes4(keccak256("transferFrom(address,uint256,address)"));
        bytes memory data = bytes4ToBytes(selector);
        // NB: `data` should now be Ox8c915b92
        data = mergeBytes(data, abi.encodePacked(uint256(to)));
        data = mergeBytes(data, abi.encodePacked(uint256(amount)));
        data = mergeBytes(data, abi.encodePacked(uint256(token)));
        // Execute it from the manager
        require(manager.execTransactionFromModule(otherModule, 0, data, Enum.Operation.Call), "Could not execute allowance");
    }

    // BYTES MANIPULATION

    /// @dev Merge two arrays a and b.
    function mergeBytes(bytes a, bytes b) internal pure returns (bytes c) {
        assembly {
            let length_c := add(mload(a), mload(b))
            // NB: The memory address 0x40 contains the `free memory pointer`
            c := mload(0x40)
            mstore(c, length_c)
            // Copy the content of a into c 32 bytes per 32 bytes
            for { let i := 0 } lt(i, div(add(mload(a), 31), 32)) { i := add(1, i) } {
                mstore(add(c, mul(32, add(1, i))), mload(add(a, mul(32, add(1, i)))))
            }
            // Copy the content of b into c 32 bytes per 32 bytes
            for { let i := 0 } lt(i, div(add(mload(b), 31), 32)) { i := add(1, i) } {
                mstore(add(c, add(mul(32, add(1, i)), mload(a))), mload(add(b, mul(32, add(1, i)))))
            }
            // NB: The length of a bytes array is stored on its first 32 bytes.
            mstore(0x40, add(c, add(32, length_c)))
        }
    }

    function bytes4ToBytes(bytes4 a) internal pure returns (bytes) {
        bytes memory b = new bytes(4);
        for (uint i = 0; i < a.length; i++)
            b[i] = a[i];
        return b;
    }
}
