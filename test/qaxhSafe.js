const utils = require('./utils')
//const solc = require('solc')
const safeUtils = require('./utilsPersonalSafe')

const GnosisSafe = artifacts.require("./GnosisSafePersonalEdition.sol");
const CreateAndAddModules = artifacts.require("./libraries/CreateAndAddModules.sol");
const ProxyFactory = artifacts.require("./ProxyFactory.sol");
const AllowanceQaxhModule = artifacts.require("./modules/QaxhModule/AllowanceQaxhModule.sol");
const QaxhMasterLedger = artifacts.require("./QaxhMasterLedger.sol");
const HumanStandardToken = artifacts.require("./Token/HumanStandardToken.sol");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

//A qaxh safe is a gnosis safe personal edition whose only owner is the qaxh address
//And who has a QaxhModule enabled (and only that)

//here, the qaxh address is played by accounts[8]

contract('AllowanceQaxhModule', function(accounts) {

    let gnosisSafe
    let qaxhModule
    let lw
    let qaxhMasterLedger
    let token

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
        let qaxhModuleMasterCopy = await AllowanceQaxhModule.new()
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
        qaxhModule = AllowanceQaxhModule.at(modules[0])

        qaxhMasterLedger = await QaxhMasterLedger.new()
        await qaxhMasterLedger.setQaxh(accounts[8])
        await qaxhModule.setLedger(qaxhMasterLedger.address)


        //Create a token to test with and watch for transfers
        token = await HumanStandardToken.new()
        await token.setUp(1000, "Qaxh Coin Test", 18 , "EUR")

        //var eventTransfer = token.Transfer();
        //eventTransfer.watch(function(err, result) {console.log(
        //    "Transfer of " + result.args._value + " EUR from " +  result.args._from + " to " + result.args._to )});


    })


    it('every test is here', async () => {

        //qaxh is played by accounts[8]
        //the owner is played by accounts[7]
        //the token creator is played by accounts[0]
        await qaxhModule.setQaxh(accounts[8])
        await qaxhModule.replaceOwner(accounts[7], {from : accounts[8]})

        var log = qaxhModule.Log();
        log.watch(function(err, result) {console.log("Event log : " + result.args.a.toString() + " , "
            + result.args.b.toString())});

        var event = qaxhModule.Event();
        event.watch(function(err, result) {console.log("Event event : " + result.args._address.toString() + " , "
            + result.args.description)});

        /*var eventStruct = qaxhModule.Struct();
        eventStruct.watch(function(err, result) {console.log("Struct : " + result.args.a.toString() + " , "
            + result.args.b.toString() + ", " + result.args.c.toString())});
        */

            //TESTING : setting up the ledger
        console.log("\n Ledger : \n ")

        //qaxh address adding a safe to the ledger
        assert(!(await qaxhMasterLedger.qaxhSafe(accounts[0])), "initialisation fails")
        assert(await qaxhMasterLedger.addSafe(accounts[0], {from : accounts[8]}), "safe adding fails")
        assert(await qaxhMasterLedger.qaxhSafe(accounts[0]), "safe adding doesn't work")
        console.log("   Adding a safe to the ledger : OK")

        //non-qaxh address trying to add a safe to the ledger
        var revert = false;
        try {
            await qaxhMasterLedger.addSafe(accounts[0], {from : accounts[0]})
        } catch (err) {
            revert = true;
        }
        assert(revert)
        console.log("   Addresses others than qaxh can't remove safe from ledger : OK")

        //qaxh address removing a safe from the ledger
        assert(await qaxhMasterLedger.addSafe(accounts[1], {from : accounts[8]}), "lol")
        assert(await qaxhMasterLedger.removeSafe(accounts[1], {from : accounts[8]}), "removing safe fails")
        assert(!(await qaxhMasterLedger.qaxhSafe(accounts[1])), "removing safe doesn't work")
        console.log("   Removing a safe from the ledger : OK")

        //non-qaxh address trying to remove a safe from the ledger
        revert = false
        try {
            await qaxhMasterLedger.removeSafe(accounts[0], {from : accounts[0]})
        } catch (err) {
            revert = true;
        }
        assert(revert)
        console.log("   Addresses others than qaxh can't remove safe from ledger : OK")

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

        //owner withdrawing ether
        let oldBalanceSafe = await web3.eth.getBalance(gnosisSafe.address).toNumber()
        let oldBalanceAccount = await web3.eth.getBalance(accounts[0]).toNumber()
        await qaxhModule.sendFromSafe(accounts[0], web3.toWei(0.1, 'ether'), 0, {from: accounts[7]}) //0 is the code for ether
        assert.equal(oldBalanceSafe - await web3.eth.getBalance(gnosisSafe.address).toNumber() , web3.toWei(0.1, 'ether'))
        assert.equal(await web3.eth.getBalance(accounts[0]).toNumber() - oldBalanceAccount, web3.toWei(0.1, 'ether'))
        console.log("   Withdrawing ether from safe : OK")

        //non-owner trying to withdraw
        revert = false
        try {
            await qaxhModule.sendFromSafe(accounts[0], web3.toWei(0.1, 'ether'), {from: accounts[0]})
        } catch (err) {
            revert = true
        }
        assert(revert)
        console.log("   Revert if a non-owner try to withdraw with sendFromSafe() : OK")

        //owner withdrawing token

        await token.transfer(gnosisSafe.address, 10) //loading the safe

        oldBalanceSafe = await token.balanceOf(gnosisSafe.address)
        oldBalanceAccount = await token.balanceOf(accounts[1])
        await qaxhModule.sendFromSafe(accounts[1], 2, token.address, {from: accounts[7]})
        assert.equal(oldBalanceSafe - await token.balanceOf(gnosisSafe.address) , 2)
        assert.equal(await token.balanceOf(accounts[1]) - oldBalanceAccount, 2)
        console.log("   Withdrawing token from safe : OK")


        //TESTING : simple allowance system, with ether
        console.log("\n Simple allowance system (ether) : \n ")

        assert.equal(await qaxhModule.getAllowance(accounts[0], 0), 0)

        //unauthorized user trying to ask for funds
        revert = false
        try {
            await qaxhModule.transferFrom(accounts[0], 4000, 0, {from : accounts[0]})
        } catch (err) {
            revert = true
        }
        assert(revert)
        console.log("   Revert if unauthorized user ask for funds : OK")

        //authorizing user who's not a qaxh safe
        revert = false
        try {
            await qaxhMasterLedger.removeSafe(accounts[0], {from: accounts[8]})
            await qaxhModule.changeAllowance(accounts[0], web3.toWei(0.05, 'ether'), 0, {from: accounts[7]})
        } catch (err) {
            revert = true
            await qaxhMasterLedger.addSafe(accounts[0], {from: accounts[8]}) //for the next tests
        }
        assert(revert)
        console.log("   Revert if owner tries to authorized a non-qaxh safe user : OK")

        //authorizing user who's a qaxh safe
        await qaxhModule.changeAllowance(accounts[0], web3.toWei(0.05, 'ether'), 0, {from : accounts[7]})
        assert.equal(await qaxhModule.getAllowance(accounts[0], 0), web3.toWei(0.05, 'ether'))
        console.log("   Changing allowance for an user : OK")

        //authorized user asking for funds under his limit
        oldBalanceAccount = await web3.eth.getBalance(accounts[1]).toNumber()
        oldBalanceSafe = await web3.eth.getBalance(gnosisSafe.address).toNumber()
        await qaxhModule.transferFrom(accounts[1], web3.toWei(0.04, 'ether'), 0, {from : accounts[0]} )
        assert.equal(await web3.eth.getBalance(accounts[1]).toNumber() -  oldBalanceAccount,  web3.toWei(0.04, 'ether'))
        assert.equal(oldBalanceSafe - await web3.eth.getBalance(gnosisSafe.address).toNumber(),  web3.toWei(0.04, 'ether'))
        assert.equal(await qaxhModule.getAllowance(accounts[0], 0), web3.toWei(0.01, 'ether'))
        console.log("   Allowed user withdrawing funds : OK")

        //authorized user asking for funds over his limit
        revert = false
        try {
            await qaxhModule.transferFrom(accounts[1], web3.toWei(0.04, 'ether'), 0, {from : accounts[0]} )
        } catch (err) {
            revert = true
        }
        assert(revert)
        console.log("   Revert if user try to go over his limit : OK")

        //cleaning up after tests
        await qaxhModule.changeAllowance(accounts[0], 0, 0, {from : accounts[7]})



        //TESTING : simple allowance system, with token
        console.log("\n Simple allowance system (token) : \n ")

        assert.equal(await qaxhModule.getAllowance(accounts[0], token.address), 0)

        //unauthorized user trying to ask for funds
        revert = false;
        try {
            await qaxhModule.transferFrom(accounts[0], 4000, token.address, {from : accounts[0]})
        } catch (err) {
            revert = true;
        }
        assert(revert)
        console.log("   Revert if unauthorized user ask for funds : OK")

        //authorizing user who's not a qaxh safe
        revert = false
        try {
            await qaxhMasterLedger.removeSafe(accounts[0], {from: accounts[8]})
            await qaxhModule.changeAllowance(accounts[0], 10, token.address, {from: accounts[7]})
        } catch (err) {
            revert = true
            await qaxhMasterLedger.addSafe(accounts[0], {from: accounts[8]}) //for the next tests
        }
        assert(revert)
        console.log("   Revert if owner tries to authorized a non-qaxh safe user : OK")

        //authorizing user who's a qaxh safe
        await qaxhModule.changeAllowance(accounts[0], 10, token.address, {from : accounts[7]})
        assert.equal(await qaxhModule.getAllowance(accounts[0], token.address), 10)
        console.log("   Changing allowance for an user : OK")

        //authorized user asking for funds under his limit
        oldBalanceAccount = await token.balanceOf(accounts[1])
        oldBalanceSafe = await token.balanceOf(gnosisSafe.address)
        await qaxhModule.transferFrom(accounts[1], 2, token.address, {from : accounts[0]} )
        var diffAccount = await token.balanceOf(accounts[1]) -  oldBalanceAccount
        var diffSafe = oldBalanceSafe - await token.balanceOf(gnosisSafe.address)
        assert.equal(diffAccount, 2)
        assert.equal(diffSafe, 2)
        assert.equal(await qaxhModule.getAllowance(accounts[0], token.address), 8)
        console.log("   Allowed user withdrawing funds : OK")

        //authorized user asking for funds over his limit
        revert = false
        try {
            await qaxhModule.transferFrom(accounts[1], 9, token.address, {from : accounts[0]} )
        } catch (err) {
            revert = true
        }
        assert(revert)
        console.log("   Revert if user try to go over his limit : OK")

        //cleaning up after tests
        await qaxhModule.changeAllowance(accounts[0], 0, token.address, {from : accounts[7]})


        //-----------------------------------------DEPRECATED--------------------------------------------//
        /*
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

        */

    })

});
