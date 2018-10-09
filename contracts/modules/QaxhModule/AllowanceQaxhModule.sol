pragma solidity 0.4.24;
import "./BasicQaxhModule.sol";


/// @title AllowanceQaxhSafe : extends BasicQaxhModule
/// allow to authorize others user to withdraw from the safe under a spending limit
/// there isn't any time limit or authomated refill of the spending limit
/// @author clem
contract AllowanceQaxhModule is BasicQaxhModule {

    mapping (address => mapping (address => uint256)) internal allowances; //mapping user address to token address to allowances

    // Getters and Setters

    function getAllowance(address user, address token) public view returns (uint256) {
        return allowances[user][token];
    }

    function changeAllowance(address user, uint256 allowance, address token) public filterOwner {
        // Only other Qaxh safes are allowed to withdraw
        require(qaxhMasterLedger.qaxhSafe(user));
        allowances[user][token] = allowance;
    }

    // Asking for funds from an authorized user (so, from a qaxh safe)

    //extern user asking for a transfert : no check is made at this point other
    //than if he has enough allowance to withdraw the amount
    //only a qaxh safe can ask for funds, so this function shouldn't be called directly by a normal account
    //instead, the owner of a qaxh safe should call askTransferFrom() on his own safe.
    function transferFrom(
        address to,
        uint256 amount,
        address token
    )
        public
    {
        require(isUnderAllowance(msg.sender, amount, token));
        allowances[msg.sender][token] -= amount;
        sendByAllowance(to, amount, token);
    }

    //do not erase this function, it's overwritten in TimedAllowanceQaxhModule.
    function isUnderAllowance(address sender, uint256 amount, address token) internal view returns (bool){
        return amount <= allowances[sender][token];
    }

    // calling the safe to transfer the funds
    function sendByAllowance(
        address to,
        uint256 amount,
        address token
    )
    internal
    {
        if (token == 0) {
            //adding something to check if the safe has enougth tokens here would be nice
            //currently, if it asks for too much no money is spend, but the transaction doesn't revert (difficult to control)
            //WARNING : you can't just import HumanStandardToken and call getBalance, since ERC20 token have different implementations.
            require(manager.execTransactionFromModule(to, amount, "", Enum.Operation.Call), "Could not execute ether transfer");
        } else {
            bytes memory data = abi.encodeWithSignature("transfer(address,uint256)", to, amount);
            require(manager.execTransactionFromModule(token, 0, data, Enum.Operation.Call), "Could not execute token transfer");
        }
    }


    ////////////////////////////////////////////////////////////////////////////////////////////////
    // Asking your module to ask for funds

    //called by the owner of this safe to call transferFrom() on the module at address otherModule.
    // IDEA : it would maybe be best to pass otherSafe in parameter rather than otherModule,
    // and to call the function on otherSafe.getModules()[0] (which must be a qaxh module, if other safe is a qaxh safe)
    function askTransferFrom(
        address otherModule,
        address to,
        uint256 amount,
        address token
    )
    public
    filterOwner
    {
        //here you have to compute the call data, and execute it from the manager
        //since only qaxh safe can be allowed to withdraw
        //on it's the gnosis safe and not the module which is the safe

        //computing the call data
        bytes4 selector = bytes4(keccak256("transferFrom(address,uint256,address)"));
        bytes memory data = bytes4ToBytes(selector);
        //should be Ox8c915b92
        data = mergeBytes(data, abi.encodePacked(uint256(to)));
        data = mergeBytes(data, abi.encodePacked(uint256(amount)));
        data = mergeBytes(data, abi.encodePacked(uint256(token)));
        //executing it from the manager
        require(manager.execTransactionFromModule(otherModule, 0, data, Enum.Operation.Call), "Could not execute allowance");
    }


    ////////////////////////////////////////////////////////////////////////////////////////////////
    // Utils for handling bytes (payload call data creation in askTransferFrom())

    // two functions to handle bytes
    function mergeBytes(
        bytes a,
        bytes b
    )
    internal
    pure
    returns (bytes c)
    {
        uint alen = a.length; // Store the length of the first array
        uint totallen = alen + b.length; // Store the length of BOTH arrays
        uint loopsa = (a.length + 31) / 32; // Count the loops required for array a (sets of 32 bytes)
        uint loopsb = (b.length + 31) / 32; // Count the loops required for array a (sets of 32 bytes)
        assembly {
            let m := mload(0x40)
            mstore(m, totallen) // Load the length of both arrays to the head of the new bytes array
            for {  let i := 0 } lt(i, loopsa) { i := add(1, i) } { mstore(add(m, mul(32, add(1, i))), mload(add(a, mul(32, add(1, i))))) } // Add the contents of a to the array
            for {  let i := 0 } lt(i, loopsb) { i := add(1, i) } { mstore(add(m, add(mul(32, add(1, i)), alen)), mload(add(b, mul(32, add(1, i))))) } // Add the contents of b to the array
            mstore(0x40, add(m, add(32, totallen)))
            c := m
        }
    }

    function bytes4ToBytes(
        bytes4 a
    )
    internal
    pure
    returns (bytes)
    {
        uint alen = a.length;

        bytes memory b = new bytes(4);
        for (uint i = 0 ; i < alen ; i++) {
            b[i] = a[i];
        }
        return b;
    }

}
