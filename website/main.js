import  {BarretenbergBackend} from '@noir-lang/backend_barretenberg';
import { Noir } from '@noir-lang/noir_js';
import {assert, ethers, wordlists} from 'ethers'
//import circuit from "../circuit/target/circuit.json"
const circuit ={"noir_version":"TODO"}
import { ProofBuilder } from './src/ProofBuilder';
import sunkETHABI  from "../exported/abi/SunkETH.json"  assert { type: 'json' };
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
  const provider = getBrowserProvider()
  const signer = await getSigner(provider)
  const sunkEthContract = new ethers.Contract(sunkEthContractAddress, sunkETHABI, provider);
  const sunkEthContractWithSigner = sunkEthContract.connect(signer)

  window.provider = provider
  window.sunkEthContractWithSigner = sunkEthContractWithSigner
  window.signer = signer
  return {signer, provider, sunkEthContractWithSigner}
}

async function depositTokens(amount) {

  //TODO check if user not accidently sending to address that already has a ballance
  //to prevent using a address twice (and thus potentually burning funds)
  const {sunkEthContractWithSigner} = await connectWallet()
  const secret = crypto.getRandomValues(new Uint8Array(32))
  const {proofInputs, burnAddress} = ProofBuilder.getProofInputs(secret)



  //burn it!! yay
  sunkEthContractWithSigner.transfer(burnAddress, amount)

  localStorage.setItem(ethers.getAddress(burnAddress), JSON.stringify(proofInputs));

  return secret

  //TODO save proofInputs (contains secret) to local storage
}

async function isClaimed(nullifier) {
  console.log(nullifier)
  const {sunkEthContractWithSigner} = await connectWallet()

  return await sunkEthContractWithSigner.nullifiers(nullifier)
}

async function withdraw(depositAddress) {
  //secret, rlp
  //wow zk magic here
  const {sunkEthContractWithSigner} = await connectWallet()
  const amount = await sunkEthContractWithSigner.balanceOf(depositAddress)
  const proofInputs = JSON.parse( localStorage.getItem(depositAddress))
  const stateRoot = (await provider.getBlock()).stateRoot
  console.log({proofInputs, amount,stateRoot })
}

//-----------------ui------------------
async function setTickerUi() {
  const {sunkEthContractWithSigner} = await connectWallet()
  const ticker = await sunkEthContractWithSigner.symbol()
  document.querySelectorAll(".ticker").forEach((element)=>{
    element.innerText = ticker
  })
}

async function setUserBalance() {
  const {signer, sunkEthContractWithSigner} = await connectWallet()
  const userBalance = await sunkEthContractWithSigner.balanceOf(signer.address)
  const units = await sunkEthContractWithSigner.decimals()
  const formattedBalance = ethers.formatUnits(userBalance,units)

  document.querySelectorAll(".userTokenBalance").forEach((element)=>{
    element.innerText = formattedBalance
  })
}



async function showDeposits() {
  const {sunkEthContractWithSigner} = await connectWallet()
  const depositsListEl = document.getElementById("depositsList")
  const ticker = await sunkEthContractWithSigner.symbol()
  const units = await sunkEthContractWithSigner.decimals()
  for (const key in localStorage) {
    if (ethers.isAddress(key)) {
      const proofInputs = JSON.parse(localStorage.getItem(key))
      //it was converted to a plain obj
      const nullifier = new Uint8Array(Object.entries(proofInputs.nullifierBytes).map((x)=>x[1]))
      if (!await isClaimed(nullifier)) {

      
        const depositAddress = ethers.getAddress(key)
      

        const amount = await sunkEthContractWithSigner.balanceOf(depositAddress)
        const formattedAmount = ethers.formatUnits(amount, units)
        const depositItemEl = document.createElement("li")
        depositItemEl.innerText = `${formattedAmount} ${ticker} at ${depositAddress}`
        const claimButton = document.createElement("button")
        claimButton.innerText = "claim"
        claimButton.onclick = async ()=>await withdraw(key)
        depositItemEl.append(claimButton)
        depositsListEl.append(depositItemEl)
      }
    }
  }

}

//-----------------handlers------------------
async function depositTokenBtnHandler() {
  const {sunkEthContractWithSigner} = await connectWallet()

  //get amount from ui
  const units = await sunkEthContractWithSigner.decimals()
  const amountInputEl = document.getElementById("depositAmountInput")
  const amount  = ethers.parseUnits(amountInputEl.value, units)

  const secret = await depositTokens(amount) 
}

async function connectWalletHandler() {
  await connectWallet()
}



function setEventListeners() {
  const connectWalletBtn = document.getElementById("connectWalletBtn")
  connectWalletBtn.addEventListener("click",async (event)=>await connectWalletHandler())

  const depositBtn = document.getElementById("depositBtn")
  depositBtn.addEventListener("click", ()=>depositTokenBtnHandler())
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
