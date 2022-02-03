
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

    const fitfhAirline = accounts[5];
    await config.flightSuretyApp.registerAirline(fitfhAirline, `Airline 5`, {from: config.firstAirline});
    const isAirline = await config.flightSuretyData.isAirlineRegistered.call(fitfhAirline)
    assert.equal(isAirline, false, "fifth airline can't beregistered without multiparty consensus");
  }); 
});
