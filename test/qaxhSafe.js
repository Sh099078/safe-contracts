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


contract('AllowanceQaxhModule', function(accounts) {
    // Constant values:
    const qaxh_address = accounts[9]
    const owner_1 = accounts[8]
    const owner_2 = accounts[7]
    const non_owner = accounts[0]
    const owner_1_bytename = "0x01"
    const owner_2_bytename = "0x02"
    const non_owner_bytename = "0x03"

    // Unique contracts (mastercopies and utility contracts):
    let qaxhMasterLedger
    let proxyFactory
    let createAndAddModules
    let gnosisSafeMasterCopy
    let qaxhModuleMasterCopy

    let setup = false

    // Deploy the mastercopies and libraries
    async function setupContracts() {
        if (setup) { return; }
        proxyFactory = await ProxyFactory.new({from : qaxh_address})
        createAndAddModules = await CreateAndAddModules.new({from : qaxh_address})
        gnosisSafeMasterCopy = await GnosisSafe.new({from : qaxh_address})
        qaxhModuleMasterCopy = await AllowanceQaxhModule.new({from : qaxh_address})
        setup = true
    }

    let gnosisSafe
    let qaxhModule

    let gnosisSafe2
    let qaxhModule2

    const CALL = 0

    beforeEach(async function () {

        await setupContracts()

        qaxhMasterLedger = await QaxhMasterLedger.new({from : qaxh_address})

        // Create Gnosis Safe and Daily Limit Module in one transactions
        let moduleData = await qaxhModuleMasterCopy.contract.setup.getData(qaxh_address, qaxhMasterLedger.address)
        let proxyFactoryData = await proxyFactory.contract.createProxy.getData(qaxhModuleMasterCopy.address, moduleData)
        let modulesCreationData = utils.createAndAddModulesData([proxyFactoryData])
        let createAndAddModulesData = createAndAddModules.contract.createAndAddModules.getData(proxyFactory.address, modulesCreationData)
        let gnosisSafeData = await gnosisSafeMasterCopy.contract.setup.getData([qaxh_address], 1, createAndAddModules.address, createAndAddModulesData)

        gnosisSafe = utils.getParamFromTxEvent(
            await proxyFactory.createProxy(gnosisSafeMasterCopy.address, gnosisSafeData),
            'ProxyCreation', 'proxy', proxyFactory.address, GnosisSafe, 'create Gnosis Safe and Filter Module',
        )

        gnosisSafe2 = utils.getParamFromTxEvent(
            await proxyFactory.createProxy(gnosisSafeMasterCopy.address, gnosisSafeData),
            'ProxyCreation', 'proxy', proxyFactory.address, GnosisSafe, 'create Gnosis Safe and Filter Module',
        )

        qaxhModule = AllowanceQaxhModule.at((await gnosisSafe.getModules())[0])
        qaxhModule2 = AllowanceQaxhModule.at((await gnosisSafe2.getModules())[0])

        await qaxhMasterLedger.addSafe(owner_1_bytename, gnosisSafe.address, {from : qaxh_address})
        await qaxhMasterLedger.addSafe(owner_2_bytename, gnosisSafe2.address, {from : qaxh_address})

        initial_load = web3.toWei(1, 'Ether')
        await web3.eth.sendTransaction({from : qaxh_address, to : gnosisSafe.address, value : initial_load})
        await web3.eth.sendTransaction({from : qaxh_address, to : gnosisSafe2.address, value : initial_load})

        await qaxhModule.activateKey(owner_1, {from : qaxh_address})
        await qaxhModule2.activateKey(owner_2, {from : qaxh_address})
    })

    it('check permissions when activating freezing or deleting a key', async () => {
        let key = accounts[3]
        // Checking qaxhModule keylist:
        assert(await qaxhModule.isActive(owner_1))
        assert(await qaxhModule.isNotAnOwner(key), true)
        assert(await qaxhModule.isNotAnOwner(owner_2))
        // Activate a key:
        await utils.assertRejects(qaxhModule.activateKey(key, {from: non_owner}))
        await utils.assertRejects(qaxhModule.activateKey(owner_2, {from: owner_1}))
        await qaxhModule.activateKey(key, {from: qaxh_address})
        assert(await qaxhModule.isActive(key))
        // Freeze a key:
        await qaxhModule.activateKey(owner_2, {from: qaxh_address})
        await utils.assertRejects(qaxhModule.freezeKey(key, {from: non_owner}))
        await utils.assertRejects(qaxhModule.freezeKey(non_owner, {from: qaxh_address}))
        await qaxhModule.freezeKey(key, {from: key})
        await qaxhModule.freezeKey(owner_2, {from: owner_1})
        await qaxhModule.freezeKey(owner_1, {from: qaxh_address})
        assert(await qaxhModule.isFrozen(key))
        assert(await qaxhModule.isFrozen(owner_2))
        assert(await qaxhModule.isFrozen(owner_1))
        // Unfreeze a key:
        await utils.assertRejects(qaxhModule.activateKey(owner_1, {from: non_owner}))
        await qaxhModule.activateKey(owner_1, {from: qaxh_address})
        await qaxhModule.activateKey(key, {from: owner_1})
        await qaxhModule.activateKey(owner_2, {from: owner_2})
        assert(await qaxhModule.isActive(owner_1))
        assert(await qaxhModule.isActive(owner_2))
        assert(await qaxhModule.isActive(key))
        // Delete a key:
        await qaxhModule.freezeKey(owner_2, {from: qaxh_address})
        await utils.assertRejects(qaxhModule.removeKey(non_owner, {from: qaxh_address}))
        await utils.assertRejects(qaxhModule.removeKey(key, {from: non_owner}))
        await utils.assertRejects(qaxhModule.removeKey(key, {from: owner_2}))
        await qaxhModule.removeKey(key, {from: key})
        await qaxhModule.removeKey(owner_2, {from: owner_1})
        await qaxhModule.removeKey(owner_1, {from: owner_1})
        assert(await qaxhModule.isNotAnOwner(owner_1))
        assert(await qaxhModule.isNotAnOwner(owner_2))
        assert(await qaxhModule.isNotAnOwner(key))
    })

    it('Add, freeze, remove and then list a QaxhModule keys', async () => {
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
        let owner_id = non_owner_bytename
        let safe_address = non_owner
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

    it('Receiving Ethers', async () => {
        let balance = web3.eth.getBalance(gnosisSafe.address).toNumber()
        let big_amount = Number(web3.toWei(0.1, 'Ether'))
        let small_amount = 1
        // Receiving Ethers from Qaxh:
        await web3.eth.sendTransaction({from : qaxh_address, to : gnosisSafe.address, value : big_amount})
        balance += big_amount
        assert.equal(balance, web3.eth.getBalance(gnosisSafe.address).toNumber())
        // Receiving Ethers from owner:
        await web3.eth.sendTransaction({from : owner_1, to : gnosisSafe.address, value : big_amount})
        balance += big_amount
        assert.equal(balance, web3.eth.getBalance(gnosisSafe.address).toNumber())
        // Receiving Ethers from another safe:
        await qaxhModule2.sendFromSafe(gnosisSafe.address, web3.toWei(0.1, 'Ether'), "", 0, {from : owner_2})
        balance += big_amount
        assert.equal(balance, web3.eth.getBalance(gnosisSafe.address).toNumber())
        // Receiving small amounts of Ethers from unknown address:
        await web3.eth.sendTransaction({from : non_owner, to : gnosisSafe.address, value : small_amount})
        balance += small_amount
        assert.equal(balance, web3.eth.getBalance(gnosisSafe.address).toNumber())
        // Receiving large amounts of Ethers from unverified address:
        try {
            // utils.assertRejects doesn't work with that one (reason unknown).
            await web3.eth.sendTransaction({from : non_owner, to : gnosisSafe.address, value : big_amount})
            assert(false)
        }
        catch (err) { }
    })

    it('Sending Ethers', async() => {
        let amount = Number(web3.toWei(0.1, 'Ether'))
        let non_owner_balance = web3.eth.getBalance(non_owner).toNumber()
        await web3.eth.sendTransaction({from : qaxh_address, to : gnosisSafe.address, value : 2 * amount})
        await web3.eth.sendTransaction({from : qaxh_address, to : gnosisSafe2.address, value : 2 * amount})
        // Owner withdrawing Ethers:
        await qaxhModule.sendFromSafe(non_owner, amount, "", 0, {from : owner_1})
        non_owner_balance += amount
        assert.equal(non_owner_balance, web3.eth.getBalance(non_owner).toNumber())
        // Non-owner withdrawing Ethers:
        await utils.assertRejects(qaxhModule.sendFromSafe(owner_2, amount, "", 0, {from : owner_2}))
    })

    it('Testing Qaxh Token', async() => {
        let token_owner = non_owner
        // Setting up the token:
        let token = await HumanStandardToken.new(1000, "Qaxh Test Token", 18, "QAXH", {from : token_owner})
        assert.equal(await token.balanceOf(token_owner), 1000)
        assert.equal(await token.totalSupply(), 1000)
        // Direct transfers:
        await token.transfer(owner_1, 400, {from : token_owner})
        await utils.assertRejects(token.transfer(owner_1, 2000, {from : token_owner}))
        assert.equal(await token.balanceOf(token_owner), 600)
        assert.equal(await token.balanceOf(owner_1), 400)
        // Delegate transfers:
        await token.approve(owner_2, 200, {from : owner_1})
        assert.equal(await token.allowance(owner_1, owner_2), 200)
        await token.transferFrom(owner_1, owner_2, 100, {from : owner_2})
        assert.equal(await token.allowance(owner_1, owner_2), 100)
        assert.equal(await token.balanceOf(owner_1), 300)
        assert.equal(await token.balanceOf(owner_2), 100)
        await utils.assertRejects(token.transferFrom(owner_1, non_owner, 200, {from : owner_2}))
        await token.approve(owner_2, 500, {from : owner_1})
        assert.equal(await token.allowance(owner_1, owner_2), 500)
        await utils.assertRejects(token.transferFrom(owner_1, non_owner, 500, {from : owner_2}))
    })

    it('Qaxh Safe sending tokens', async() => {
        let token_owner = non_owner;
        let totalSupply = 1000
        let name = "Qaxh Test Token"
        let decimals = 18
        let symbol = "EUR"
        let token = await HumanStandardToken.new(totalSupply, name, decimals, symbol, {from : token_owner})
        await token.transfer(gnosisSafe.address, 500, {from : token_owner})
        // Sending without allowance:
        await utils.assertRejects(qaxhModule2.askTransferFrom(gnosisSafe.address, owner_2, token.balanceOf(gnosisSafe.address), token.address, {from : owner_2}))
        // Allowing a non-qaxh-safe address:
        await utils.assertRejects(qaxhModule.approve(non_owner, 10, token.address))
        // Setting up the allowance:
        let allowance = 200;
        assert.equal(await qaxhModule.getAllowance(gnosisSafe2.address, token.address), 0)
        await qaxhModule.approve(gnosisSafe2.address, 2 * allowance, token.address, {from : owner_1})
        await qaxhModule.approve(gnosisSafe2.address, allowance, token.address, {from : owner_1})
        assert.equal(await qaxhModule.getAllowance(gnosisSafe2.address, token.address), allowance)
        // Delegate transfers:
        await qaxhModule2.askTransferFrom(gnosisSafe.address, gnosisSafe2.address, allowance - 50, token.address, {from : owner_2})
        await utils.assertRejects(qaxhModule2.askTransferFrom(gnosisSafe.address, gnosisSafe2.address, allowance * 2, token.address, {from : owner_2}))
        assert.equal(await qaxhModule.getAllowance(gnosisSafe2.address, token.address), 50)
        assert.equal(await token.balanceOf(gnosisSafe2.address), allowance - 50)
        await qaxhModule2.askTransferFrom(gnosisSafe.address, gnosisSafe2.address, 50, token.address, {from : owner_2})
        assert.equal(await qaxhModule.getAllowance(gnosisSafe2.address, token.address), 0)
        assert.equal(await token.balanceOf(gnosisSafe2.address), allowance)
    })

    it('Saving and certifying a Qaxh safe identity', async() => {
        // Non-Qaxh address trying to setup the identity:
        await utils.assertRejects(qaxhModule.callSetupIdentity("QI_0", "QE_0", 1, {from : non_owner}))
        // Setting up the identity:
        //await utils.assertRejects(qaxhModule.callSetupIdentity("QI_0", "QE_0", 0, {from : qaxh_address}))
        //await utils.assertRejects(qaxhModule.callSetupIdentity("QI_0", "QE_0", 4, {from : qaxh_address}))
        await qaxhModule.callSetupIdentity("QI_1", "QE_1", 1, {from : qaxh_address})
        assert.equal(await qaxhModule.QI_hash(), "QI_1")
        assert.equal(await qaxhModule.QE_hash(), "QE_1")
        assert.equal(await qaxhModule.eIDAS(), 1)
        // Changing an already setup safe identity:
        await utils.assertRejects(qaxhModule.callSetupIdentity("QI_2", "QE_2", 1, {from : qaxh_address}))
        // Non-owner trying to validate the QaxhModule identity:
        await utils.assertRejects(qaxhModule.acceptIdentity({from : non_owner}))
        // Owner validating the QaxhModule identity:
        receipt = await qaxhModule.acceptIdentity({from : owner_1});
        logs = receipt["logs"];
        assert.equal(logs.length, 1);
        assert.equal(logs[0]["event"], "CertifyIdentity");
        assert.equal(logs[0]["args"]["certifier"], owner_1)
    })

    //TODO Implement the feature in QaxhModule
    it.skip('Refund the qaxh owner after a QaxhModule function call', async() => {
        var owner_balance = await web3.eth.getBalance(owner_1).toNumber()
        await qaxhModule.freezeKey(owner_1, {from: owner_1})
        var current_balance = await web3.eth.getBalance(owner_1).toNumber()
        console.log("balance:  " + current_balance)
        console.log("expected: " + owner_balance)
        assert(current_balance >= owner_balance)
    })
});
