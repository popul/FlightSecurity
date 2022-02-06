import Web3 from 'web3';
import express from 'express';

import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';

const config = Config['localhost'];
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
let accounts;
web3.eth.defaultAccount = web3.eth.accounts[0];

const flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
const flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);

const oracleStartIndex = 30;
const TEST_ORACLES_COUNT = 50;
const oracleIndexes = [];
const DEV_MODE = false;

flightSuretyApp.events.OracleRequest({
    // fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error);

    const {flight, timestamp, index } = event.returnValues;
    submitOracleResponses(flight, timestamp, index); 
});

async function registerOracles() {
  let fee = await flightSuretyApp.methods.REGISTRATION_FEE().call();
  console.log(`Oracle fee: ${fee}`);

  for (let i = oracleStartIndex ; i < oracleStartIndex + TEST_ORACLES_COUNT; i++) {
    await flightSuretyApp.methods.registerOracle().send({
      from: accounts[i],
      value: fee,
      gasLimit: 400000,
    });

    let oracleIndex = await flightSuretyApp.methods.getMyIndexes().call({
      from: accounts[i],
    });

    console.log(`Oracle registered: ${i} with indexes ${oracleIndex}`);

    oracleIndexes.push(oracleIndex);
  }
}

async function submitOracleResponses(flight, timestamp, index) {
  const STATUS_CODE_UNKNOWN = 0;
  const STATUS_CODE_ON_TIME = 10;
  const STATUS_CODE_LATE_AIRLINE = 20;
  const STATUS_CODE_LATE_WEATHER = 30;
  const STATUS_CODE_LATE_TECHNICAL = 40;
  const STATUS_CODE_LATE_OTHER = 50;

  const statusCodes = [
    STATUS_CODE_UNKNOWN,
    STATUS_CODE_ON_TIME,
    STATUS_CODE_LATE_AIRLINE,
    STATUS_CODE_LATE_WEATHER,
    STATUS_CODE_LATE_TECHNICAL,
    STATUS_CODE_LATE_OTHER,
  ];

  for (let i = oracleStartIndex; i < oracleStartIndex + TEST_ORACLES_COUNT; i++) {
    if (!oracleIndexes[i - oracleStartIndex].includes(index)) continue;
    const oracleResponse = DEV_MODE ? STATUS_CODE_LATE_AIRLINE : statusCodes[Math.floor(Math.random() * statusCodes.length)];
    await flightSuretyApp.methods.submitOracleResponse(
      DEV_MODE ? 0 : index,
      accounts[1],
      flight,
      timestamp,
      oracleResponse
    ).send({ from: accounts[i], gasLimit: 400000 });

    console.log(`sent response ${oracleResponse} for flight ${flight}, oracle ${i}`);
  }
}

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

async function initialize() {
  accounts = await web3.eth.getAccounts()

  const isFirstAirlineFounded = await flightSuretyData.methods
      .isAirlineFunded(accounts[1])
      .call({from: accounts[0]});

  if (DEV_MODE) {
    await flightSuretyApp.methods.setDevMode(true).send({from: accounts[0]});
  }

  if (!isFirstAirlineFounded) {
    await flightSuretyApp.methods.addInitialFunds().send({
      from: accounts[1],
      value: web3.utils.toWei("10", "ether"),
    });
  }

  await registerOracles();
}
initialize()

export default app;


