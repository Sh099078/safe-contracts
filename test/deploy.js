const utils = require('./utils')

const GnosisSafe = artifacts.require("./GnosisSafePersonalEdition.sol");
const CreateAndAddModules = artifacts.require("./libraries/CreateAndAddModules.sol");
const ProxyFactory = artifacts.require("./ProxyFactory.sol");
const AllowanceQaxhModule = artifacts.require("./modules/QaxhModule/AllowanceQaxhModule.sol");
const QaxhMasterLedger = artifacts.require("./QaxhMasterLedger.sol");
const HumanStandardToken = artifacts.require("./Token/HumanStandardToken.sol");

//A qaxh safe is a gnosis safe personal edition whose only owner is the qaxh address
//And who has a QaxhModule enabled (and only that)

//here, the qaxh address is played by accounts[8]

contract('AllowanceQaxhModule', function(accounts) {

    let gnosisSafe
    let qaxhModule
    let qaxhMasterLedger
    let token

    const CALL = 0

    beforeEach(async function () {

        // Create Master Copies
        let proxyFactory = await ProxyFactory.new()
        console.log("proxyFactory ", proxyFactory.address)
        let createAndAddModules = await CreateAndAddModules.new()
        console.log("createAndAddModules ", createAndAddModules.address)
        let gnosisSafeMasterCopy = await GnosisSafe.new()
        console.log("gnosisSafeMasterCopy", gnosisSafeMasterCopy.address)

        // Initialize safe master copy
        gnosisSafeMasterCopy.setup([accounts[8]], 1, 0, "0x")
        let qaxhModuleMasterCopy = await AllowanceQaxhModule.new()
        // Initialize module master copy
        qaxhModuleMasterCopy.setup()

        // Create QaxhMasterLedger and initialize it
        qaxhMasterLedger = await QaxhMasterLedger.new()
        await qaxhMasterLedger.setQaxh(accounts[8])

        //Create a token to test with
        token = await HumanStandardToken.new()
        await token.setUp(1000, "Qaxh Coin Test", 18 , "EUR")

        // Get data for creation
        // (safe and module in one transaction)
        let moduleData = await qaxhModuleMasterCopy.contract.setup.getData()
        let proxyFactoryData = await proxyFactory.contract.createProxy.getData(qaxhModuleMasterCopy.address, moduleData)
        let modulesCreationData = utils.createAndAddModulesData([proxyFactoryData])
        let createAndAddModulesData = createAndAddModules.contract.createAndAddModules.getData(proxyFactory.address, modulesCreationData)
        let gnosisSafeData = await gnosisSafeMasterCopy.contract.setup.getData([accounts[8]], 1, createAndAddModules.address, createAndAddModulesData)
        console.log("got data for creation")

        /*
        // Creation
        gnosisSafe = utils.getParamFromTxEvent(
            await proxyFactory.createProxy(gnosisSafeMasterCopy.address, gnosisSafeData),
            'ProxyCreation', 'proxy', proxyFactory.address, GnosisSafe, 'create Gnosis Safe and Filter Module',
        )
        let modules = await gnosisSafe.getModules()
        qaxhModule = AllowanceQaxhModule.at(modules[0])
        await qaxhModule.setLedger(qaxhMasterLedger.address)


        //var eventTransfer = token.Transfer();
        //eventTransfer.watch(function(err, result) {console.log(
        //    "Transfer of " + result.args._value + " EUR from " +  result.args._from + " to " + result.args._to )});
        */

    })

    it('every test is here', async () => {
        console.log("Deploying....")
    })

});