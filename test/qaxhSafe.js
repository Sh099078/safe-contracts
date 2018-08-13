const utils = require('./utils')
//const solc = require('solc')
const safeUtils = require('./utilsPersonalSafe')

const GnosisSafe = artifacts.require("./GnosisSafePersonalEdition.sol");
const CreateAndAddModules = artifacts.require("./libraries/CreateAndAddModules.sol");
const ProxyFactory = artifacts.require("./ProxyFactory.sol");
const TimedAllowanceQaxhModule = artifacts.require("./modules/QaxhModule/TimedAllowanceQaxhModule.sol");
const QaxhMasterLedger = artifacts.require("./QaxhMasterLedger.sol");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

//A qaxh safe is a gnosis safe personal edition whose only owner is the qaxh address
//And who has a QaxhModule enabled (and only that)

//here, the qaxh address is played by accounts[8]

contract('TimedAllowanceQaxhModule', function(accounts) {

    let gnosisSafe
    let qaxhModule
    let lw
    let qaxhMasterLedger

    const CALL = 0

    beforeEach(async function () {

        // Create lightwallet
        lw = await utils.createLightwallet()
        // Create Master Copies
        let proxyFactory = await ProxyFactory.new()
        let createAndAddModules = await CreateAndAddModules.new()
        let gnosisSafeMasterCopy = await GnosisSafe.new()
        // Initialize safe master copy
        gnosisSafeMasterCopy.setup([accounts[8]], 1, 0, "0x")
        let qaxhModuleMasterCopy = await TimedAllowanceQaxhModule.new()
        // Initialize module master copy
        qaxhModuleMasterCopy.setup()
        // Create Gnosis Safe and Daily Limit Module in one transactions
        let moduleData = await qaxhModuleMasterCopy.contract.setup.getData()
        let proxyFactoryData = await proxyFactory.contract.createProxy.getData(qaxhModuleMasterCopy.address, moduleData)
        let modulesCreationData = utils.createAndAddModulesData([proxyFactoryData])
        let createAndAddModulesData = createAndAddModules.contract.createAndAddModules.getData(proxyFactory.address, modulesCreationData)
        let gnosisSafeData = await gnosisSafeMasterCopy.contract.setup.getData([accounts[8]], 1, createAndAddModules.address, createAndAddModulesData)
        //let gnosisSafeData = await gnosisSafeMasterCopy.contract.setup.getData([lw.accounts[0], lw.accounts[1], lw.accounts[2]], 2, 0, "0x")
        gnosisSafe = utils.getParamFromTxEvent(
            await proxyFactory.createProxy(gnosisSafeMasterCopy.address, gnosisSafeData),
            'ProxyCreation', 'proxy', proxyFactory.address, GnosisSafe, 'create Gnosis Safe and Filter Module',
        )

        let modules = await gnosisSafe.getModules()
        qaxhModule = TimedAllowanceQaxhModule.at(modules[0])

        qaxhMasterLedger = await QaxhMasterLedger.new()
        await qaxhMasterLedger.setQaxh(accounts[8])
        await qaxhModule.setLedger(qaxhMasterLedger.address)
    })


    it('every test is here', async () => {

        //qaxh is played by accounts[8]
        //the owner is played by accounts[7]
        await qaxhModule.setQaxh(accounts[8])
        await qaxhModule.replaceOwner(accounts[7], {from : accounts[8]})

        var event = qaxhModule.Log();
        event.watch(function(err, result) {console.log("Event log : " + result.args.a.toString() + " , "
            + result.args.b.toString())});

        var eventStruct = qaxhModule.Struct();
        eventStruct.watch(function(err, result) {console.log("Struct : " + result.args.a.toString() + " , "
            + result.args.b.toString() + ", " + result.args.c.toString())});

            //TESTING : setting up the ledger
        console.log("\n Ledger : \n ")

        //qaxh address adding a safe to the ledger
        assert(!(await qaxhMasterLedger.qaxhSafe(accounts[0])), "initialisation fails")
        assert(await qaxhMasterLedger.addSafe(accounts[0], {from : accounts[8]}), "safe adding fails")
        assert(await qaxhMasterLedger.qaxhSafe(accounts[0]), "safe adding doesn't work")
        console.log("   Adding a safe to the ledger : OK")

        //non-qaxh address trying to add a safe to the ledger
        try {
            await qaxhMasterLedger.addSafe(accounts[0], {from : accounts[0]})
        } catch (err) {
            console.log("   Addresses others than qaxh can't remove safe from ledger : OK")
        }

        //qaxh address removing a safe from the ledger
        assert(await qaxhMasterLedger.addSafe(accounts[1], {from : accounts[8]}), "lol")
        assert(await qaxhMasterLedger.removeSafe(accounts[1], {from : accounts[8]}), "removing safe fails")
        assert(!(await qaxhMasterLedger.qaxhSafe(accounts[1])), "removing safe doesn't work")
        console.log("   Removing a safe from the ledger : OK")

        //non-qaxh address trying to remove a safe from the ledger
        try {
            await qaxhMasterLedger.removeSafe(accounts[0], {from : accounts[0]})
        } catch (err) {
            console.log("   Addresses others than qaxh can't remove safe from ledger : OK")
        }

            //TESTING : loading the safe
        console.log("\n Loading the safe : \n ")

        //owner loading the safe
        await web3.eth.sendTransaction({from: accounts[7], to: gnosisSafe.address, value: web3.toWei(5, 'ether')})
        assert.equal( await web3.eth.getBalance(gnosisSafe.address).toNumber(), 5000000000000000000)
        console.log("   Owner loading the safe : OK")

        //little payment loading the safe
        await web3.eth.sendTransaction({from: accounts[1], to: gnosisSafe.address, value: web3.toWei(0.000000001, 'ether')})
        assert.equal( await web3.eth.getBalance(gnosisSafe.address).toNumber(), 5000000001000000000)
        console.log("   Little payments loading the safe : OK")

        //known safe loading the safe
        await web3.eth.sendTransaction({from: accounts[0], to: gnosisSafe.address, value: web3.toWei(0.1, 'ether')})
        assert.equal( await web3.eth.getBalance(gnosisSafe.address).toNumber(), 5100000001000000000)
        console.log("   Known safe loading the safe : OK")

            //TESTING : withdrawing
        console.log("\n Withdrawing by the owner : \n ")

        //owner withdrawing
        let oldBalanceSafe = await web3.eth.getBalance(gnosisSafe.address).toNumber()
        let oldBalanceAccount = await web3.eth.getBalance(accounts[0]).toNumber()
        await qaxhModule.sendFromSafe(accounts[0], web3.toWei(0.1, 'ether'), {from: accounts[7]})
        assert.equal(oldBalanceSafe - await web3.eth.getBalance(gnosisSafe.address).toNumber() , web3.toWei(0.1, 'ether'))
        assert.equal(await web3.eth.getBalance(accounts[0]).toNumber() - oldBalanceAccount, web3.toWei(0.1, 'ether'))
        console.log("   Withdrawing from safe : OK")

        //non-owner trying to withdraw
        try {
            await qaxhModule.sendFromSafe(accounts[0], web3.toWei(0.1, 'ether'), {from: accounts[0]})
        } catch (err) {
            console.log("   Revert if a non-owner try to withdraw with sendFromSafe() : OK")
        }

            //TESTING : simple allowance system
        console.log("\n Simple allowance system : \n ")

        assert.equal(await qaxhModule.getAllowance(accounts[0]), 0)

        //unauthorized user trying to ask for funds
        try {
            await qaxhModule.transferFrom(accounts[0], 4000, {from : accounts[0]})
        } catch (err) {
            console.log("   Revert if unauthorized user ask for funds : OK")
        }

        //authorizing user who's not a qaxh safe
        try {
            await qaxhMasterLedger.removeSafe(accounts[0], {from: accounts[8]})
            await qaxhModule.changeAllowance(accounts[0], web3.toWei(0.05, 'ether'), {from: accounts[7]})
        } catch (err) {
            console.log("   Revert if owner tries to authorized a non-qaxh safe user : OK")
            await qaxhMasterLedger.addSafe(accounts[0], {from: accounts[8]}) //for the next tests
        }

        //authorizing user who's a qaxh safe
        await qaxhModule.changeAllowance(accounts[0], web3.toWei(0.05, 'ether'), {from : accounts[7]})
        assert.equal(await qaxhModule.getAllowance(accounts[0]), web3.toWei(0.05, 'ether'))
        console.log("   Changing allowance for an user : OK")

        //authorized user asking for funds under his limit
        oldBalanceAccount = await web3.eth.getBalance(accounts[1]).toNumber()
        oldBalanceSafe = await web3.eth.getBalance(gnosisSafe.address).toNumber()
        await qaxhModule.transferFrom(accounts[1], web3.toWei(0.04, 'ether'), {from : accounts[0]} )
        assert.equal(await web3.eth.getBalance(accounts[1]).toNumber() -  oldBalanceAccount,  web3.toWei(0.04, 'ether'))
        assert.equal(oldBalanceSafe - await web3.eth.getBalance(gnosisSafe.address).toNumber(),  web3.toWei(0.04, 'ether'))
        assert.equal(await qaxhModule.getAllowance(accounts[0]), web3.toWei(0.01, 'ether'))
        console.log("   Allowed user withdrawing funds : OK")

        //authorized user asking for funds over his limit
        try {
            await qaxhModule.transferFrom(accounts[1], web3.toWei(0.04, 'ether'), {from : accounts[0]} )
        } catch (err) {
            console.log("   Revert if user try to go over his limit : OK")
        }

        //cleaning up after tests
        await qaxhModule.changeAllowance(accounts[0], 0, {from : accounts[7]})


                //TESTING : timed allowance system
        console.log("\n Timed allowance system : \n ")

        var temp;

        //authorizing user who's a qaxh safe
        await qaxhModule.changeTimedAllowance(accounts[0], web3.toWei(0.05, 'ether'), 10 , {from : accounts[7]})
        assert.equal(await qaxhModule.getAllowance(accounts[0]), web3.toWei(0.05, 'ether'))
        assert.equal(await qaxhModule.getSpendingLimit(accounts[0]), web3.toWei(0.05, 'ether'))
        temp = await qaxhModule.getFrequency(accounts[0])
        assert.equal(temp.toNumber(), 10)
        console.log("   Changing allowance for an user : OK")

        //authorized user asking for funds under his limit
        oldBalanceAccount = await web3.eth.getBalance(accounts[1]).toNumber()
        oldBalanceSafe = await web3.eth.getBalance(gnosisSafe.address).toNumber()
        await qaxhModule.transferFrom(accounts[1], web3.toWei(0.04, 'ether'), {from : accounts[0]} )
        assert.equal(await web3.eth.getBalance(accounts[1]).toNumber() -  oldBalanceAccount,  web3.toWei(0.04, 'ether'))
        assert.equal(oldBalanceSafe - await web3.eth.getBalance(gnosisSafe.address).toNumber(),  web3.toWei(0.04, 'ether'))
        assert.equal(await qaxhModule.getAllowance(accounts[0]), web3.toWei(0.01, 'ether'))
        console.log("   Allowed user withdrawing funds : OK")

        await sleep(10000) //wait 10 sec, so that renewal can works

        //authorized user asking for funds under his limit, af
        oldBalanceAccount = await web3.eth.getBalance(accounts[1]).toNumber()
        oldBalanceSafe = await web3.eth.getBalance(gnosisSafe.address).toNumber()
        await qaxhModule.transferFrom(accounts[1], web3.toWei(0.04, 'ether'), {from : accounts[0]} )
        assert.equal(await web3.eth.getBalance(accounts[1]).toNumber() -  oldBalanceAccount,  web3.toWei(0.04, 'ether'))
        assert.equal(oldBalanceSafe - await web3.eth.getBalance(gnosisSafe.address).toNumber(),  web3.toWei(0.04, 'ether'))
        assert.equal(await qaxhModule.getAllowance(accounts[0]), web3.toWei(0.01, 'ether'))
        console.log("   Renewal after expected time : OK")

        //authorized user asking for funds before renewal time passed (basically, he's over his limit)
        try {
            await sleep(5000) //wait 5 sec, shouldn't trigger renewal
            await qaxhModule.transferFrom(accounts[1], web3.toWei(0.04, 'ether'), {from : accounts[0]} )
        } catch (err) {
            console.log("   Renewal doesn't activate before expected time : OK")
        }

    })

});
