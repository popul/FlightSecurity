pragma solidity ^0.5;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

import "./FlightSuretyData.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner; // Account used to deploy contract

    FlightSuretyData private dataContract;

    bool private devMode;

    struct Votes {
        uint8 numVotes;
        mapping(address => bool) voters;
    }

    mapping(address => Votes) private airlinesVotes;

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
    modifier requireIsOperational() {
        require(isOperational(), "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireDataContract() {
        require(
            address(dataContract) != address(0),
            "Data contract is not set"
        );
        _;
    }

    modifier requireAirlineRegistered() {
        require(
            dataContract.isAirlineRegistered(msg.sender),
            "Airline is not registered"
        );
        _;
    }

    modifier requireAirlineFunded() {
        require(
            dataContract.isAirlineFunded(msg.sender),
            "Airline is not funded"
        );
        _;
    }

    modifier giveBackChange(uint256 value) {
        _;
        uint256 change = msg.value.sub(value);
        if (change > 0) {
            msg.sender.transfer(change);
        }
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
     * @dev Contract constructor
     *
     */
    constructor() public {
        contractOwner = msg.sender;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() public view requireDataContract returns (bool) {
        return dataContract.isOperational(); // Modify to call data contract's status
    }

    function setDataContract(address _dataContractAddress)
        external
        requireContractOwner
    {
        require(
            _dataContractAddress != address(0),
            "Data contract address cannot be empty"
        );

        address payable addr = address(uint160(_dataContractAddress));
        dataContract = FlightSuretyData(addr);
    }

    function setDevMode(bool _devMode)
        external
        requireContractOwner
    {
        devMode = _devMode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function setTestingMode(bool _isTesting) public requireIsOperational {}

    event VoteEmitted(
        address voter,
        address airline,
        bool success,
        uint256 numVotes
    );

    /**
     * @dev Add an airline to the registration queue
     *
     */
    function registerAirline(address _airline, string calldata _airlineName)
        external
        requireDataContract
        requireAirlineRegistered
        requireAirlineFunded
        requireIsOperational
        returns (bool success, uint256 numVotes)
    {
        require(
            dataContract.isAirlineRegistered(_airline) == false,
            "Airline is already registered"
        );

        if (dataContract.getAirlineCount() < 4) {
            dataContract.registerAirline(_airline, _airlineName);
            emit VoteEmitted(msg.sender, _airline, true, 1);
            return (true, 1);
        } else {
            Votes storage votes = airlinesVotes[_airline];
            require(
                votes.voters[msg.sender] == false,
                "Airline has already voted for this airline"
            );

            votes.voters[msg.sender] = true;
            votes.numVotes = votes.numVotes + 1;

            uint256 neededVotes = dataContract.getFoundedAirlineCount() / 2;

            if (votes.numVotes >= neededVotes) {
                dataContract.registerAirline(_airline, _airlineName);
                uint256 returnNumVotes = votes.numVotes;
                delete airlinesVotes[_airline];
                emit VoteEmitted(msg.sender, _airline, true, returnNumVotes);
                return (true, returnNumVotes);
            } else {
                emit VoteEmitted(msg.sender, _airline, false, votes.numVotes);
                return (false, votes.numVotes);
            }
        }
    }

    function addInitialFunds()
        external
        payable
        requireAirlineRegistered
        requireDataContract
        giveBackChange(10 ether)
        requireIsOperational
    {
        require(msg.value >= 10 ether, "10 ethers are required");
        require(
            dataContract.isAirlineFunded(msg.sender) == false,
            "Airline is already funded"
        );

        dataContract.setAirlineAsFunded();

        address payable addr = address(uint160(address(dataContract)));
        addr.transfer(10 ether);
    }

    /**
     * @dev Register a future flight for insuring.
     *
     */
    function registerFlight(string calldata flightNumber, uint256 flightTimestamp)
        external
        requireDataContract
        requireAirlineFunded
        requireIsOperational
    {
        require(
            dataContract.isFlightRegistered(flightNumber) == false,
            "Flight is already registered"
        );

        dataContract.registerFlight(flightNumber, flightTimestamp);
    }

    function buyInsurance(string calldata flightNumber)
        external
        payable
        giveBackChange(1 ether)
        requireIsOperational
    {
        require(
            dataContract.isFlightRegistered(flightNumber),
            "Flight is not registered"
        );

        require(
            msg.value > 0,
            "value can't be null"
        );

        address payable addr = address(uint160(address(dataContract)));
        uint256 insuranceCost = msg.value;
        if (insuranceCost > 1 ether) {
            insuranceCost = 1 ether;
        }

        dataContract.creditInsurance(flightNumber, insuranceCost);

        addr.transfer(insuranceCost);
    }

    /**
     * @dev Called after oracle has updated flight status
     *
     */
    function processFlightStatus(
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) private {
        require(
            dataContract.isFlightRegistered(flight),
            "Flight is not registered"
        );

        dataContract.updateFlight(flight, timestamp, statusCode);

        if (statusCode == STATUS_CODE_LATE_AIRLINE) {
            dataContract.creditFlightInsurees(flight);
        }
    }

    function withdraw()
        payable
        external
        requireIsOperational
    {
        dataContract.withdraw();
    }

    function getBalance()
        external
        view
        requireIsOperational
        returns (uint256)
    {
        return dataContract.getBalance(msg.sender);
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(
        address airline,
        string calldata flight,
        uint256 timestamp
    ) 
        external
        requireIsOperational
     {
        uint8 index = devMode == true ? 0 : getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        oracleResponses[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(index, airline, flight, timestamp);
    }

    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses; // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    event OracleReport(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp
    );

    // Register an oracle with the contract
    function registerOracle()
        external
        payable
        requireIsOperational
      {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
    }

    function getMyIndexes()
        external
        view
        requireIsOperational
        returns (uint8[3] memory) {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );

        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index,
        address airline,
        string calldata flight,
        uint256 timestamp,
        uint8 statusCode
    ) 
        external
        requireIsOperational
    {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES || devMode
        ) {
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(flight, timestamp, statusCode);
        }
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account)
        internal
        returns (uint8[3] memory)
    {
        if (devMode == true) {
            return [0, 0, 0];
        }

        uint8[3] memory indexes;

        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(
            uint256(
                keccak256(
                    abi.encodePacked(blockhash(block.number - nonce++), account)
                )
            ) % maxValue
        );

        if (nonce > 250) {
            nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    // endregion
}
