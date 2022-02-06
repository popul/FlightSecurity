# FlightSurety

FlightSurety is a sample application project for Udacity's Blockchain course.

## Prequisites

- Node v14
- Ganache v7.0.1
- Truffle 5.4.13

## Install


This repository contains Smart Contract code in Solidity (using Truffle), tests (also using Truffle), dApp scaffolding (using HTML, CSS and JS) and server app scaffolding.

To install, download or clone the repo, then:

`npm install`
`truffle compile`

## Develop Client

Be sure to run ganache (i used v7) at first step:
```sh
ganache -m "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat" -a 100
```

To run truffle tests:

```sh
truffle test ./test/all.js
```

To use the dapp:

`truffle migrate`
`npm run dapp`

To view dapp:

`http://localhost:8000`

## Develop Server

Be sure to run ganache (i used v7) at first step:
```sh
ganache -m "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat" -a 100
```

`npm run server`

## Deploy

To build dapp for prod:
`npm run dapp:prod`

Deploy the contents of the ./dapp folder


## Resources

* [How does Ethereum work anyway?](https://medium.com/@preethikasireddy/how-does-ethereum-work-anyway-22d1df506369)
* [BIP39 Mnemonic Generator](https://iancoleman.io/bip39/)
* [Truffle Framework](http://truffleframework.com/)
* [Ganache Local Blockchain](http://truffleframework.com/ganache/)
* [Remix Solidity IDE](https://remix.ethereum.org/)
* [Solidity Language Reference](http://solidity.readthedocs.io/en/v0.4.24/)
* [Ethereum Blockchain Explorer](https://etherscan.io/)
* [Web3Js Reference](https://github.com/ethereum/wiki/wiki/JavaScript-API)