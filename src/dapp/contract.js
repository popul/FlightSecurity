import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";
import Web3 from "web3";

export default class Contract {
  constructor(network, callback) {
    let config = Config[network];
    this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
    // this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
    this.flightSuretyApp = new this.web3.eth.Contract(
      FlightSuretyApp.abi,
      config.appAddress
    );
    this.initialize(callback);
    this.owner = null;
    this.airlines = [];
    this.passengers = [];
  }

  initialize(callback) {
    this.web3.eth.getAccounts((error, accts) => {
      this.owner = accts[0];

      let counter = 1;

      while (this.airlines.length < 5) {
        this.airlines.push(accts[counter++]);
      }

      while (this.passengers.length < 5) {
        this.passengers.push(accts[counter++]);
      }

      callback();
    });
  }

  onFlightStatusInfo(trigger) {
    this.flightSuretyApp.events.FlightStatusInfo(
      {},
      function(error, event) {
        if (error) console.error(error);
        trigger(event);
      })
  }

  getEthBalance() {
    return this.web3.eth.getBalance(this.passengers[0]);
  }

  getInsureeBalance() {
    return this.flightSuretyApp.methods.getBalance().call({
      from: this.passengers[0]
    });
  }

  withdraw() {
    return this.flightSuretyApp.methods.withdraw().send({
      from: this.passengers[0]
    });
  }


  isOperational() {
    return this.flightSuretyApp.methods
      .isOperational()
      .call({ from: this.owner });
  }

  registerFlight(flight, flightTs) {
    return this.flightSuretyApp.methods
        .registerFlight(flight, flightTs)
        .send({
          from: this.airlines[0],
          gasLimit: 200000
        });
  }

  buyInsurance(flight) {
    return this.flightSuretyApp.methods
        .buyInsurance(flight)
        .send({
          from: this.passengers[0],
          value: this.web3.utils.toWei('2.5', 'ether'),
          gasLimit: 200000
        });
  }

  async fetchFlightStatus(flight) {
    let payload = {
      airline: this.airlines[0],
      flight: flight,
      timestamp: Math.floor(Date.now() / 1000),
    };

    await this.flightSuretyApp.methods
      .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
      .send({ from: this.owner });

    return payload;
  }
}
