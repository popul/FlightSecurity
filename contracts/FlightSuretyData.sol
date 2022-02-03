pragma solidity ^0.5;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    address private authorizedCaller;

    struct Airline {
        string name;
        bool funded;
    }
    mapping(address => Airline) private airlines;
    uint256 private numAirlines = 0;

    uint256 numFounded = 0;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor(address airlineAddress, string memory airlineName) public 
    {
        contractOwner = msg.sender;
        registerAirline(airlineAddress, airlineName);
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(tx.origin== contractOwner, "Caller is not contract owner");
        _;
    }

    /**
    * @dev Modifier that requires the "authorizedCaller" account to be the function caller
    */
    modifier requireAuthorizedCaller()
    {
        require(msg.sender == authorizedCaller, "Caller is not authorized");
        _;
    }

    modifier requireAuthorizedOrContractOwner() {
        require(msg.sender == authorizedCaller || tx.origin == contractOwner, "Not authorized");
        _;   
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view
                            requireAuthorizedOrContractOwner
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    function authorizeCaller(address caller) external requireContractOwner {
        authorizedCaller = caller;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function isAirlineRegistered(address airlineAddress) external view returns(bool) {
        return bytes(airlines[airlineAddress].name).length > 0;
    }

    function isAirlineFunded(address airlineAddress) external view returns(bool) {
        return airlines[airlineAddress].funded;
    }
   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline(address airline, string memory name)
        public
        requireAuthorizedOrContractOwner
    {
        require(bytes(airlines[airline].name).length == 0, "Airline already registered");
        airlines[airline] = Airline({name: name, funded: false});
        numAirlines = numAirlines.add(1);
    }

    function getAirlineCount() external view requireAuthorizedOrContractOwner returns(uint256) {
        return numAirlines;
    }

    function getFoundedAirlineCount() external view requireAuthorizedOrContractOwner returns(uint256) {
        return numFounded;
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (                             
                            )
                            external
                            requireAuthorizedCaller
                            payable
    {

    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                )
                                external
                                requireAuthorizedCaller
                                view 
    {
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            )
                            external
                            requireAuthorizedCaller
                            view
    {
    }

    function setAirlineAsFunded() external requireAuthorizedCaller {
        require(airlines[tx.origin].funded == false, "Airline already funded");
        
        airlines[tx.origin].funded = true;
        numFounded = numFounded.add(1);
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        view 
                        requireAuthorizedCaller
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
                            requireAuthorizedCaller
    {
    }
}

