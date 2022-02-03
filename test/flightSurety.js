
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it('(Data contract security) Should authorize caller on business public functions', async () => {
    const callerAddress = accounts[10];

    await config.flightSuretyData.authorizeCaller(callerAddress);

    let throwExp = false;
    try {
        await config.flightSuretyData.isOperational.call({from: callerAddress});
    }
    catch (e) {
        throwExp = true;
        console.error(e);
    }
    finally {
        assert.equal(throwExp, false, "Authorization should be successful");
    }
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  it('(Data contract security) Should prevent access to non authorized callers on business public functions', async () => {
    const callerAddress = accounts[11];

    let throwExp = false;
    try {
        await config.flightSuretyData.isOperational.call({from: callerAddress});
    }
    catch (e) {
        throwExp = true;
    }
    finally {
        assert.equal(throwExp, true, "Authorization should be denied");
    }
  });

  it('(Data contract security) Should prevent access to methods that depends on data contract if not set', async() => {
    let throwExp = false;
    try {
        await config.flightSuretyApp.isOperational.call();
    }
    catch (e) {
        throwExp = true;
    }
    finally {
        assert.equal(throwExp, true, "should prevent access to methods that depends on data contract if not set");
    }

    throwExp = false; 
    try {
        await config.flightSuretyApp.setDataContract(config.flightSuretyData.address);
        await config.flightSuretyApp.isOperational.call();
    }
    catch (e) {
        throwExp = true;
    }
    finally {
        assert.equal(throwExp, false, "should authorize access to methods that depends on data contract if set");
    } 
  });

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyApp.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSuretyApp.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) a airline is registered at deployed time', async () => {
    let numAirlines = await config.flightSuretyData.getAirlineCount.call();
    assert.equal(numAirlines, 1, "Airline is not registered at deployed time");
  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, 'Airline 2', {from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });

  it('(airline) only registered airlines can register new airlines until 4', async() => {
    await config.flightSuretyApp.addInitialFunds({from: config.firstAirline, value: web3.utils.toWei('10', 'ether')});
    assert.equal(await config.flightSuretyData.getFoundedAirlineCount.call(), 1, "Initial funded airline count is not 1");

    for(let i = 2 ; i < 5 ; i++) {
        const newAirline = accounts[i];

        await config.flightSuretyApp.registerAirline(newAirline, `Airline ${i}`, {from: config.firstAirline});
        const isAirline = await config.flightSuretyData.isAirlineRegistered.call(newAirline)
        assert.equal(isAirline, true, "Airline is not registered");

        await config.flightSuretyApp.addInitialFunds({from: newAirline, value: web3.utils.toWei('10', 'ether')});
        assert.equal(await config.flightSuretyData.isAirlineFunded.call(newAirline), true, `Airline must be funded`);
        assert.equal(await config.flightSuretyData.getFoundedAirlineCount.call(), i, "Wrong airline founded count");
    }
  }); 

  it('(airline) next airlines must be accepted by 50% of registered and founded airlines', async() => {
    const fitfhAirline = accounts[5];

    const r1 = await config.flightSuretyApp.registerAirline(fitfhAirline, `Airline 5`, {from: config.firstAirline});
    const log1 = r1.logs[0].args;
    assert.equal(
        log1.success, false, 
        "fifth airline can't be registered without multiparty consensus"
    );
    assert.equal(
        log1.numVotes, 1, 
        "wrong number of votes"
    );

    const secondAirline = accounts[2];

    const r2 = await config.flightSuretyApp.registerAirline(fitfhAirline, `Airline 5`, {from: secondAirline});
    const log2 = r2.logs[0].args;
    assert.equal(
        log2.success, true,
        "fifth airline must be registered because 50% of airlines have registered it"
    );
    assert.equal(
        log2.numVotes, 2,
        "wrong number of votes"
    );
  });

  it('(airline) can\'t register twice an airline', async() => {
    const fitfhAirline = accounts[5];

    let throwExp = false;
    try {
        await config.flightSuretyApp.registerAirline(fitfhAirline, `Airline 5`, {from: config.firstAirline});
    }
    catch {
        throwExp = true;
    }

    assert.equal(throwExp, true, "Airline can't be registered twice");

  });

  it('(passengers) purchase flight insurance capped to 1 ether', async () => {
      const passenger1 = accounts[20];

      const flightTs = new Date('2020-01-01').getTime() / 1000;
      await config.flightSuretyApp.registerFlight('AH5821', flightTs, { from: config.firstAirline });

      assert.equal(
          await config.flightSuretyData.isFlightRegistered('AH5821'),
          true,
          "Flight is not registered"
      );
        
      const passengerBalanceBefore = web3.utils.toBN(await web3.eth.getBalance(passenger1));
      const tx = await config.flightSuretyApp.buyInsurance('AH5821', { from: passenger1, value: web3.utils.toWei('2.5', 'ether')});
      const passengerBalanceAfter = web3.utils.toBN(await web3.eth.getBalance(passenger1));

      const txGasCost = web3.utils.toBN(tx.receipt.effectiveGasPrice).muln(tx.receipt.gasUsed);
      assert.equal(
          passengerBalanceBefore.sub(passengerBalanceAfter).sub(txGasCost).toString(),
          web3.utils.toWei('1', 'ether'),
          "Passenger balance is not correct"
      );

      const insuranceBalance = await config.flightSuretyData.getInsureeBalance.call('AH5821', passenger1);
      assert.equal(insuranceBalance, web3.utils.toWei('1', 'ether'), "Insurance balance is not correct");
  });
});
