import Web3 from 'web3';
import express from 'express';

import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';

const config = Config['localhost'];
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
const flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
const flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
const contractOwner = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
const firstAirline = "0xf17f52151EbEF6C7334FAD080c5704D77216b732";

flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error)
    console.log(event)
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

async function initialize() {
  const isFirstAirlineFounded = await flightSuretyData.methods.isAirlineFunded(firstAirline).call({from: contractOwner});
  if (!isFirstAirlineFounded) {
    await flightSuretyApp.methods.addInitialFunds().send({
      from: firstAirline,
      value: web3.utils.toWei("10", "ether"),
    });
  }
}
initialize()

export default app;


