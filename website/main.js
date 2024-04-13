import  {BarretenbergBackend} from '@noir-lang/backend_barretenberg';
import { Noir } from '@noir-lang/noir_js';
import {assert, ethers, wordlists} from 'ethers'
//import circuit from "../circuit/target/circuit.json"
const circuit ={"noir_version":"TODO"}
import { SunkEthInteracter } from './src/SunkEthInteracter';
//const sunkETHABI =["function decimals() view returns (uint8)","function symbol() view returns (string)","function balanceOf(address owner) view returns (uint256)","function transfer(address to, uint amount) returns (bool)"]
const sunkEthContractAddress = "0x455410A0bE0A365564a385bF4Da97e8e1Cc16290"

const setup = async () => {
  await Promise.all([
    import("@noir-lang/noirc_abi").then(module => 
      module.default(new URL("@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm", import.meta.url).toString())
    ),
    import("@noir-lang/acvm_js").then(module => 
      module.default(new URL("@noir-lang/acvm_js/web/acvm_js_bg.wasm", import.meta.url).toString())
    )
  ]);
}
//-----------------functions------------------
function getBrowserProvider() {
  try {
    return new ethers.BrowserProvider(window.ethereum)
  } catch (error) {
    console.warn("couldnt connect to browser wallet")
    console.warn(error)
    return false
  }
}

/**
 * 
 * @param {ethers.provider} provider 
 */
async function getSigner(provider) {
  try {
    return await provider.getSigner()
  } catch (error) {
    console.warn("couldnt connect to browser wallet")
    console.warn(error)
    return false
  }
}


async function connectWallet() {
  //TODO maybe make more efficient by not creating a new provider and etc every time we need it
  const provider = getBrowserProvider()
  const signer = await getSigner(provider)

  const sunkEthInteracter = new SunkEthInteracter(sunkEthContractAddress, signer)

  

  window.provider = provider
  window.signer = signer
  window.sunkEthInteracter = sunkEthInteracter
  return {signer, provider, sunkEthInteracter}
}

//-----------------ui------------------
async function setTickerUi() {
  const {sunkEthInteracter} = await connectWallet()
  const ticker = await sunkEthInteracter.sunkEthContract.symbol()
  document.querySelectorAll(".ticker").forEach((element)=>{
    element.innerText = ticker
  })
}

async function setUserBalance() {
  const {signer, sunkEthInteracter} = await connectWallet()
  const userBalance = await sunkEthInteracter.sunkEthContract.balanceOf(signer.address)
  const units = await sunkEthInteracter.sunkEthContract.decimals()
  const formattedBalance = ethers.formatUnits(userBalance,units)

  document.querySelectorAll(".userTokenBalance").forEach((element)=>{
    element.innerText = formattedBalance
  })
}



async function showDeposits() {
  const {sunkEthInteracter} = await connectWallet()
  const depositsListEl = document.getElementById("depositsList")
  const ticker = await sunkEthInteracter.sunkEthContract.symbol()

  const deposits = await sunkEthInteracter.getDepositFromLocalStorage()

  for(const address in deposits) {
    const deposit = deposits[address]
    const formattedAmount = await sunkEthInteracter.formatAmount(deposit.amount)

    const depositItemEl = document.createElement("li")
    depositItemEl.innerText = `${formattedAmount} ${ticker} at ${address}`
    const claimButton = document.createElement("button")
    claimButton.innerText = "claim"
    claimButton.onclick = async ()=>await withdrawHandler(deposit.nullifierData)
    depositItemEl.append(claimButton)
    depositsListEl.append(depositItemEl)
    console.log(depositItemEl)

  }

}


//-----------------handlers------------------
async function shieldTokenBtnHandler() {
  const {sunkEthInteracter} = await connectWallet()

  //get amount from ui
  const amountInputEl = document.getElementById("depositAmountInput")
  const amount  = sunkEthInteracter.parseAmount(amountInputEl.value)

  const secret = await sunkEthInteracter.shieldTokens(amount) 
}

async function connectWalletHandler() {
  await connectWallet()
}

async function withdrawHandler(nullifierData) {
  const {sunkEthInteracter} = await connectWallet()
  await sunkEthInteracter.unShieldTokens(nullifierData)

}



function setEventListeners() {
  const connectWalletBtn = document.getElementById("connectWalletBtn")
  connectWalletBtn.addEventListener("click",async (event)=>await connectWalletHandler())

  const shieldBtn = document.getElementById("shieldBtn")
  shieldBtn.addEventListener("click", ()=>shieldTokenBtnHandler())
}

async function populateUiValues() {
  await setTickerUi()
  await setUserBalance()
  await showDeposits()

}


async function main() {
  console.log(`using circuit noir version: ${circuit.noir_version}, full obj: `,circuit)
  console.log(`using sunkenEthContractAddress: ${sunkEthContractAddress}`)
  setEventListeners()
  await populateUiValues()



}
window.onload = main
// function display(container, msg) {
//   const c = document.getElementById(container);
//   const p = document.createElement('p');
//   p.textContent = msg;
//   c.appendChild(p);
// }

// document.getElementById('submitGuess').addEventListener('click', async () => {
//   try {
//     // here's where love happens
//     const backend = new BarretenbergBackend(circuit);
//     const noir = new Noir(circuit, backend);
//     const x = parseInt(document.getElementById('guessInput').value);

//     const input = { x, y: 2 };
//     await setup(); // let's squeeze our wasm inits here

//     display('logs', 'Generating proof... ⌛');
//     const proof = await noir.generateProof(input); //generateProof in docs
//     display('logs', 'Generating proof... ✅');
//     display('results', proof.proof);
//   } catch(err) {
//     console.log(err)
//     display("logs", "Oh 💔 Wrong guess")
//   }
// });
