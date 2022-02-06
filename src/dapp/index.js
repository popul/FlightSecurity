import Web3 from "web3";
import DOM from "./dom";
import Contract from "./contract";
import "./flightsurety.css";

(async () => {
  let contract = new Contract("localhost", () => {
    // Read transaction
    contract.isOperational((error, result) => {
      console.log(error, result);
      display("Operational Status", "Check if contract is operational", [
        { label: "Operational Status", error: error, value: result },
      ]);
    });

    contract.onFlightStatusInfo(({ returnValues: { flight, status }}) => {
      display('Oracles', 'Receive status', [
        { label: 'Flight ', value: `Flight ${flight}, Status ${status}` },
      ])
    });

    async function updateInsureeBalance() {
      const balance = await contract.getInsureeBalance();
      let balanceSpan = DOM.elid("insuree-balance");
      balanceSpan.innerHTML = `${Web3.utils.fromWei(balance, 'ether')} eth`;
    }

    async function updateEthereumBalance() {
      const balance = await contract.getEthBalance();
      let balanceSpan = DOM.elid("ethereum-insuree-balance");
      balanceSpan.innerHTML =  `${Web3.utils.fromWei(balance, 'ether')} eth`;
    }

    DOM.elid("refresh-balance").addEventListener("click", updateInsureeBalance);
    DOM.elid("refresh-ethereum-balance").addEventListener("click", updateEthereumBalance);

    DOM.elid("withdraw").addEventListener("click", async () => {
      await contract.withdraw();
      updateInsureeBalance();
      updateEthereumBalance();
    });

    // User-submitted transaction
    DOM.elid("submit-oracle").addEventListener("click", async () => {
      let flight = DOM.elid("flight-number").value;

      await contract.registerFlight(flight, Math.floor(Date.now() / 1000));

      await contract.buyInsurance(flight);

      // Write transaction
      try {
        const status = await contract.fetchFlightStatus(flight);
        display("Oracles", "Trigger oracles", [
          {
            label: "Fetch Flight Status",
            value: status.flight + " " + status.timestamp,
          },
        ]);
      }
      catch (error) {
        display("Oracles", "Trigger oracles", [
          {
            label: "Fetch Flight Status",
            error,
          },
        ]);
      }
    });
  });
})();

function display(title, description, results) {
  let displayDiv = DOM.elid("display-wrapper");
  let section = DOM.section();
  section.appendChild(DOM.h2(title));
  section.appendChild(DOM.h5(description));
  results.map((result) => {
    let row = section.appendChild(DOM.div({ className: "row" }));
    row.appendChild(DOM.div({ className: "col-sm-4 field" }, result.label));
    row.appendChild(
      DOM.div(
        { className: "col-sm-8 field-value" },
        result.error ? String(result.error) : String(result.value)
      )
    );
    section.appendChild(row);
  });
  displayDiv.append(section);
}
