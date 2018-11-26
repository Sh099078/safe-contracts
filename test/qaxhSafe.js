const utils = require('./utils')
const safeUtils = require('./utilsPersonalSafe')

const GnosisSafe = artifacts.require("./GnosisSafePersonalEdition.sol");
const CreateAndAddModules = artifacts.require("./libraries/CreateAndAddModules.sol");
const ProxyFactory = artifacts.require("./ProxyFactory.sol");
const AllowanceQaxhModule = artifacts.require("./modules/QaxhModule/AllowanceQaxhModule.sol");
const QaxhMasterLedger = artifacts.require("./QaxhMasterLedger.sol");
const HumanStandardToken = artifacts.require("./Token/HumanStandardToken.sol");

const nullAddress = /^0x0{40}$/

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// A qaxh safe is a gnosis safe personal edition whose only owner is the qaxh address
// and who has a QaxhModule enabled (and only that)

contract('AllowanceQaxhModule', function(accounts) {

    let qaxh_address = accounts[9]
    let owner_1 = accounts[8]
    let owner_2 = accounts[7]
    let owner_1_bytename = "0x01"
    let owner_2_bytename = "0x02"
    let token_creator = owner_2

    let gnosisSafe
    let qaxhModule
    let lw //lightWallet
    let qaxhMasterLedger
    let token

    let gnosisSafe2
    let qaxhModule2

    const CALL = 0

    beforeEach(async function () {

        // Create lightwallet
        lw = await utils.createLightwallet()

        // Create Master Copies
        let proxyFactory = await ProxyFactory.new({from : qaxh_address})
        let createAndAddModules = await CreateAndAddModules.new({from : qaxh_address})
        let gnosisSafeMasterCopy = await GnosisSafe.new({from : qaxh_address})

        // Initialize safe master copy
        gnosisSafeMasterCopy.setup([qaxh_address], 1, 0, "0x")

        //QaxhMasterLedger
        qaxhMasterLedger = await QaxhMasterLedger.new({from : qaxh_address})

        //Create a token to test with and watch for transfers
        token = await HumanStandardToken.new({from : token_creator})
        await token.setUp(1000, "Qaxh Coin Test", 18, "EUR", {from : token_creator})

        //module
        let qaxhModuleMasterCopy = await AllowanceQaxhModule.new({from : qaxh_address})

        // Create Gnosis Safe and Daily Limit Module in one transactions
        let moduleData = await qaxhModuleMasterCopy.contract.setup.getData(qaxh_address, qaxhMasterLedger.address)
        let proxyFactoryData = await proxyFactory.contract.createProxy.getData(qaxhModuleMasterCopy.address, moduleData)
        let modulesCreationData = utils.createAndAddModulesData([proxyFactoryData])
        let createAndAddModulesData = createAndAddModules.contract.createAndAddModules.getData(proxyFactory.address, modulesCreationData)
        let gnosisSafeData = await gnosisSafeMasterCopy.contract.setup.getData([qaxh_address], 1, createAndAddModules.address, createAndAddModulesData)

        // First qaxh safe
        // Owner: accounts[7]
        gnosisSafe = utils.getParamFromTxEvent(
            await proxyFactory.createProxy(gnosisSafeMasterCopy.address, gnosisSafeData),
            'ProxyCreation', 'proxy', proxyFactory.address, GnosisSafe, 'create Gnosis Safe and Filter Module',
        )

        qaxhModule = AllowanceQaxhModule.at((await gnosisSafe.getModules())[0])

        // Second qaxh safe
        // Owner: Accounts[0]
        gnosisSafe2 = utils.getParamFromTxEvent(
            await proxyFactory.createProxy(gnosisSafeMasterCopy.address, gnosisSafeData),
            'ProxyCreation', 'proxy', proxyFactory.address, GnosisSafe, 'create Gnosis Safe and Filter Module',
        )

        qaxhModule2 = AllowanceQaxhModule.at((await gnosisSafe2.getModules())[0])

        await qaxhModule.activateKey(owner_1, {from : qaxh_address})
        //await qaxhModule2.activateKey(owner_2, {from : qaxh_address})
    })

    it('activate, freeze and then delete a key', async () => {
        let key = accounts[3]

        assert.equal(await qaxhModule.isNotAnOwner(key), true)
        assert.equal(await qaxhModule.isFrozen(key), false)
        assert.equal(await qaxhModule.isActive(key), false)

        await qaxhModule.activateKey(key, {from : qaxh_address})

        assert.equal(await qaxhModule.isActive(key), true)
        assert.equal(await qaxhModule.isFrozen(key), false)
        assert.equal(await qaxhModule.isNotAnOwner(key), false)

        await qaxhModule.freezeKey(key, {from: qaxh_address})

        assert.equal(await qaxhModule.isActive(key), false)
        assert.equal(await qaxhModule.isNotAnOwner(key), false)
        assert.equal(await qaxhModule.isFrozen(key), true)

        await qaxhModule.removeKey(key, {from: qaxh_address})

        assert.equal(await qaxhModule.isNotAnOwner(key), true)
        assert.equal(await qaxhModule.isFrozen(key), false)
        assert.equal(await qaxhModule.isActive(key), false)
    })

    it('check presence of keys in keyList', async () => {
        let k0 = accounts[0];
        let k1 = accounts[1];
        let k2 = accounts[2];
        let k3 = accounts[3];
        let k4 = accounts[4];

        assert.equal(await qaxhModule.isInKeyList(k1), false)

        for (i = 0; i < 5; i++)
            await qaxhModule.activateKey(accounts[i], {from : qaxh_address});


        assert.equal(await qaxhModule.isInKeyList(k2), true)
        assert.equal(await qaxhModule.isInKeyList(k1), true)
        assert.equal(await qaxhModule.isInKeyList(k4), true)

        //Remove element in the middle of the list:

        await qaxhModule.removeKey(k2, {from : qaxh_address});

        assert.equal(await qaxhModule.isInKeyList(k1), true)
        assert.equal(await qaxhModule.isInKeyList(k2), false)
        assert.equal(await qaxhModule.isInKeyList(k4), true)

        // Remove the head of the list:

        await qaxhModule.removeKey(k0, {from : qaxh_address});

        assert.equal(await qaxhModule.isInKeyList(k1), true)
        assert.equal(await qaxhModule.isInKeyList(k4), true)
        assert.equal(await qaxhModule.isInKeyList(k0), false)

        // Verify that keyList corresponds to keyStatus:

        for(i = 0; i < 5; i++)
            assert.equal(await qaxhModule.isInKeyList(accounts[i]), !(await qaxhModule.isNotAnOwner(accounts[i])))
    })

    it('list the safe keys per type (active, frozen)', async () => {
        await qaxhModule.removeKey(owner_1, {from : qaxh_address})
        assert.equal(await qaxhModule.listLength(await qaxhModule.listKeys(true, true)), 0)
        for(i = 0; i < 7; i++)
            await qaxhModule.activateKey(accounts[i], {from : qaxh_address});

        assert.equal(await qaxhModule.listLength(await qaxhModule.listKeys(true, false)), 7)
        assert.equal(await qaxhModule.listLength(await qaxhModule.listKeys(true, true)), 7)
        assert.equal(await qaxhModule.listLength(await qaxhModule.listKeys(false, true)), 0)

        for(i = 0; i < 7; i = i + 2)
            await qaxhModule.freezeKey(accounts[i], {from : qaxh_address});

        assert.equal(await qaxhModule.listLength(await qaxhModule.listKeys(false, true)), 4)
        assert.equal(await qaxhModule.listLength(await qaxhModule.listKeys(true, false)), 3)
        assert.equal(await qaxhModule.listLength(await qaxhModule.listKeys(true, true)), 7)
    })

    it('QaxhMasterLedger : add, remove, get and check existence of a Qaxh Safe', async () => {
        let owner_id = "0x01"
        let safe_address = "0xaaaaaaaaaabbbbbbbbbbccccccccccdddddddddd"
        assert(!(await qaxhMasterLedger.isQaxhSafe(safe_address)))
        // Adding a safe as the Qaxh address:
        await qaxhMasterLedger.addSafe(owner_id, safe_address, {from : qaxh_address})
        assert(await qaxhMasterLedger.isQaxhSafe(safe_address))
        assert.equal(await qaxhMasterLedger.getQaxhSafe(owner_id), safe_address)
        // Removing a safe with another address than Qaxh:
        await utils.assertRejects(qaxhMasterLedger.removeSafe(owner_id, {from : owner_1}))
        // Removing a safe as the Qaxh address:
        await qaxhMasterLedger.removeSafe(owner_id, {from : qaxh_address})
        assert(!(await qaxhMasterLedger.isQaxhSafe(safe_address)))
        // Adding a safe with another address than Qaxh:
        await utils.assertRejects(qaxhMasterLedger.addSafe(owner_id, safe_address, {from : owner_1}))
    })

    it('Safe receiving Ethers', async () => {
        // Receiving Ethers from Qaxh:
        let balance = web3.eth.getBalance(gnosisSafe.address).toNumber()
        let big_amount = Number(web3.toWei(0.1, 'Ether'))
        let little_amount = 1
        await web3.eth.sendTransaction({from : qaxh_address, to : gnosisSafe.address, value : big_amount})
        balance += big_amount
        assert.equal(balance, web3.eth.getBalance(gnosisSafe.address).toNumber())
        // Receiving Ethers from owner:
        await web3.eth.sendTransaction({from : owner_1, to : gnosisSafe.address, value : big_amount})
        balance = balance + big_amount
        assert.equal(balance, web3.eth.getBalance(gnosisSafe.address).toNumber())
        // Receiving Ethers from another safe:
        // Receiving small amounts of Ethers from unknown address:
        // Receiving large amounts of Ethers from unverified address:
    })

    it('Withdrawing Ethers from safe', async() => {
        // Owner withdrawing Ethers:
        // Non-owner withdrawing Ethers:
    })

    it('every test is here', async () => {

        //TESTING : loading the safe
        console.log("\n Loading the safe : \n ")

        //owner loading the safe
        await web3.eth.sendTransaction({from: owner_1, to: gnosisSafe.address, value: web3.toWei(5, 'ether')})
        assert.equal(await web3.eth.getBalance(gnosisSafe.address).toNumber(), 5000000000000000000)
        console.log("   Owner loading the safe : OK")

        //little payment loading the safe
        await web3.eth.sendTransaction({from: accounts[1], to: gnosisSafe.address, value: web3.toWei(0.000000001, 'ether')})
        assert.equal(await web3.eth.getBalance(gnosisSafe.address).toNumber(), 5000000001000000000)
        console.log("   Little payments loading the safe : OK")

        //known safe loading the safe
        assert(await qaxhMasterLedger.addSafe(owner_2_bytename, gnosisSafe2.address, {from : qaxh_address}), "lol") //adding second safe to first safe's known safes
        await web3.eth.sendTransaction({from: owner_2, to: gnosisSafe2.address, value: web3.toWei(5, 'ether')}) //loading the second safe
        await qaxhModule2.sendFromSafe(gnosisSafe.address, web3.toWei(0.1, 'ether'), "", 0, {from: owner_2}) //loading the first safe from the second safe
        assert.equal(await web3.eth.getBalance(gnosisSafe.address).toNumber(), 5100000001000000000)
        console.log("   Known safe loading the safe : OK")

            //TESTING : withdrawing
        console.log("\n Withdrawing by the owner : \n ")

        //owner withdrawing ether
        let oldBalanceSafe = await web3.eth.getBalance(gnosisSafe.address).toNumber()
        let oldBalanceAccount = await web3.eth.getBalance(owner_2).toNumber()
        await qaxhModule.sendFromSafe(owner_2, web3.toWei(0.1, 'ether'), "", 0, {from: owner_1}) //0 is the code for ether
        assert.equal(oldBalanceSafe - await web3.eth.getBalance(gnosisSafe.address).toNumber() , web3.toWei(0.1, 'ether'))
        assert.equal(await web3.eth.getBalance(owner_2).toNumber() - oldBalanceAccount, web3.toWei(0.1, 'ether'))
        console.log("   Withdrawing ether from safe : OK")

        //non-owner trying to withdraw
        revert = false
        try {
            await qaxhModule.sendFromSafe(owner_2, web3.toWei(0.1, 'ether'), "", 0, {from: owner_2})
        } catch (err) {
            revert = true
        }
        assert(revert)
        console.log("   Revert if a non-owner try to withdraw with sendFromSafe() : OK")

        //owner withdrawing token

        await token.transfer(gnosisSafe.address, 10) //loading the safe

        oldBalanceSafe = await token.balanceOf(gnosisSafe.address)
        oldBalanceAccount = await token.balanceOf(accounts[1])
        await qaxhModule.sendFromSafe(accounts[1], 2, "", token.address, {from: owner_1})
        assert.equal(oldBalanceSafe - await token.balanceOf(gnosisSafe.address), 2)
        assert.equal(await token.balanceOf(accounts[1]) - oldBalanceAccount, 2)
        console.log("   Withdrawing token from safe : OK")

        //TESTING : simple allowance system, with ether
        console.log("\n Simple allowance system (ether) : \n ")

        assert.equal(await qaxhModule.getAllowance(gnosisSafe2.address, 0), 0)

        //unauthorized user trying to ask for funds
        revert = false
        try {
            await qaxhModule.transferFrom(gnosisSafe2.address, 4000, 0, {from : owner_2})
        } catch (err) {
            revert = true
        }
        assert(revert)
        console.log("   Revert if unauthorized user ask for funds : OK")

        //authorizing user who's not a qaxh safe
        revert = false
        try {
            await qaxhMasterLedger.removeSafe(gnosisSafe2.address, {from: qaxh_address})
            await qaxhModule.changeAllowance(gnosisSafe2.address, web3.toWei(0.05, 'ether'), 0, {from: owner_1})
        } catch (err) {
            revert = true
            await qaxhMasterLedger.addSafe(owner_2_bytename, gnosisSafe2.address, {from: qaxh_address}) //for the later tests
        }
        assert(revert)
        console.log("   Revert if owner tries to authorized a non-qaxh safe user : OK")

        //authorizing user who's a qaxh safe
        await qaxhModule.changeAllowance(gnosisSafe2.address, web3.toWei(0.05, 'ether'), 0, {from : owner_1})
        assert.equal(await qaxhModule.getAllowance(gnosisSafe2.address, 0), web3.toWei(0.05, 'ether'))
        console.log("   Changing allowance for an user : OK")

        //authorized user asking for funds under his limit
        oldBalanceAccount = await web3.eth.getBalance(accounts[1]).toNumber()
        oldBalanceSafe = await web3.eth.getBalance(gnosisSafe.address).toNumber()
        await qaxhModule2.askTransferFrom(qaxhModule.address, accounts[1], web3.toWei(0.04, 'ether'), 0, {from : owner_2} )
        assert.equal(await web3.eth.getBalance(accounts[1]).toNumber() -  oldBalanceAccount,  web3.toWei(0.04, 'ether'))
        assert.equal(oldBalanceSafe - await web3.eth.getBalance(gnosisSafe.address).toNumber(),  web3.toWei(0.04, 'ether'))
        assert.equal(await qaxhModule.getAllowance(gnosisSafe2.address, 0), web3.toWei(0.01, 'ether'))
        console.log("   Allowed user withdrawing funds : OK")

        //authorized user asking for funds over his limit
        revert = false
        try {
            await qaxhModule2.askTransferFrom(qaxhModule.address, accounts[1], web3.toWei(0.04, 'ether'), 0, {from : owner_2} )
        } catch (err) {
            revert = true
        }
        assert(revert)
        console.log("   Revert if user try to go over his limit : OK")

        //cleaning up after tests
        await qaxhModule.changeAllowance(gnosisSafe2.address, 0, 0, {from : owner_1})

        //TESTING : simple allowance system, with token
        console.log("\n Simple allowance system (token) : \n ")

        assert.equal(await qaxhModule.getAllowance(gnosisSafe2.address, token.address), 0)

        //unauthorized user trying to ask for funds
        revert = false
        try {
            await qaxhModule.transferFrom(gnosisSafe2.address, 4000, token.address, {from : owner_2})
        } catch (err) {
            revert = true
        }
        assert(revert)
        console.log("   Revert if unauthorized user ask for funds : OK")

        //authorizing user who's not a qaxh safe
        revert = false
        try {
            await qaxhMasterLedger.removeSafe(gnosisSafe2.address, {from: qaxh_address})
            await qaxhModule.changeAllowance(gnosisSafe2.address, 2, token.address, {from: owner_1})
        } catch (err) {
            revert = true
            await qaxhMasterLedger.addSafe(owner_2_bytename, gnosisSafe2.address, {from: qaxh_address}) //for the later tests
        }
        assert(revert)
        console.log("   Revert if owner tries to authorized a non-qaxh safe user : OK")

        //authorizing user who's a qaxh safe
        await qaxhModule.changeAllowance(gnosisSafe2.address, 10, token.address, {from : owner_1})
        assert.equal(await qaxhModule.getAllowance(gnosisSafe2.address, token.address), 10)
        console.log("   Changing allowance for an user : OK")

        //authorized user asking for funds under his limit
        oldBalanceAccount = await token.balanceOf(accounts[1])
        oldBalanceSafe = await token.balanceOf(gnosisSafe.address)
        await qaxhModule2.askTransferFrom(qaxhModule.address, accounts[1], 7, token.address, {from : owner_2} )
        assert.equal(await token.balanceOf(accounts[1]) -  oldBalanceAccount, 7)
        assert.equal(oldBalanceSafe - await token.balanceOf(gnosisSafe.address), 7)
        assert.equal(await qaxhModule.getAllowance(gnosisSafe2.address, token.address), 3)
        console.log("   Allowed user withdrawing funds : OK")

        //authorized user asking for funds over his limit
        revert = false
        try {
            await qaxhModule2.askTransferFrom(qaxhModule.address, accounts[1], 4, token.address, {from : owner_2} )
        } catch (err) {
            revert = true
        }
        assert(revert)
        console.log("   Revert if user try to go over his limit : OK")
    })
});
