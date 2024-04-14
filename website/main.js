import  {BarretenbergBackend} from '@noir-lang/backend_barretenberg';
import { Noir } from '@noir-lang/noir_js';
import {assert, ethers, wordlists} from 'ethers'
//import circuit from "../circuit/target/circuit.json"
const circuit ={"noir_version":"TODO"}
import { SunkEthInteracter } from './src/SunkEthInteracter';
//const sunkETHABI =["function decimals() view returns (uint8)","function symbol() view returns (string)","function balanceOf(address owner) view returns (uint256)","function transfer(address to, uint amount) returns (bool)"]
import {processProof} from '../scripts/processProof'
import { getStorageKey } from '../scripts/getStorageKey'

window.processProof = processProof
window.getStorageKey = getStorageKey

const sunkEthContractAddress = "0xCa842A2Da8767d4F6cE016270c2cf43d5812f251"
window.ethers = ethers
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

  document.querySelectorAll(".useSendTokenInput").forEach((element)=>{
    element.max = formattedBalance
  })
}



async function showDeposits() {
  const {sunkEthInteracter} = await connectWallet()
  const depositsListEl = document.getElementById("depositsList")
  depositsListEl.innerHTML = ""
  const ticker = await sunkEthInteracter.sunkEthContract.symbol()

  const deposits = await sunkEthInteracter.getDepositFromLocalStorage()
  
  for(const address in deposits) {
    const deposit = deposits[address]
    const formattedAmount = await sunkEthInteracter.formatAmount(deposit.amount)

    const depositItemEl = document.createElement("li")
    depositItemEl.innerText = ` ${formattedAmount} ${ticker} at ${address}`
    if (deposit.isClaimed) {
      depositItemEl.className += " strikeThrough"
    } else {
      const claimButton = document.createElement("button")
      claimButton.innerText = "remint"
      claimButton.onclick = async ()=>await unshieldHandler(deposit.nullifierData)
      depositItemEl.prepend(claimButton)

    }

    depositsListEl.append(depositItemEl)

  }

}


//-----------------handlers------------------
async function unwrapEthHandler() {
  const {sunkEthInteracter} = await connectWallet()

  const unwrapAmountInput = document.getElementById("unwrapAmountInput")
  const amount = await sunkEthInteracter.parseAmount(unwrapAmountInput.value)

  const tx  = await sunkEthInteracter.unwrapEth(amount)
  console.log(await tx.wait(1))
  await refreshUiValues()

  
}

async function wrapEthHandler() {
  const {sunkEthInteracter} = await connectWallet()

  const wrapAmountInput = document.getElementById("wrapAmountInput")
  //const amount = await sunkEthInteracter.parseAmount(wrapAmountInput.value)
  const amount = ethers.parseEther(wrapAmountInput.value)
  const tx  = await sunkEthInteracter.wrapEth(amount)
  console.log(await tx.wait(1))
  await refreshUiValues()

  
}

async function shieldTokenBtnHandler() {
  const {sunkEthInteracter} = await connectWallet()

  //get amount from ui
  const amountInputEl = document.getElementById("shieldAmountInput")
  const amount  = sunkEthInteracter.parseAmount(amountInputEl.value)

  const tx = await sunkEthInteracter.shieldTokens(amount) 
  console.log(await tx.wait(1))
  await refreshUiValues()
}

async function connectWalletHandler() {
  await connectWallet()
}

async function unshieldHandler(nullifierData) {
  const {sunkEthInteracter} = await connectWallet()
  const tx  = await sunkEthInteracter.unShieldTokens(nullifierData)
  console.log(await tx.wait(1))
  await refreshUiValues()
}




function setEventListeners() {
  const connectWalletBtn = document.getElementById("connectWalletBtn")
  connectWalletBtn.addEventListener("click",async (event)=>await connectWalletHandler())

  const wrapBtn = document.getElementById("wrapBtn")
  wrapBtn.addEventListener("click",async ()=>await wrapEthHandler())

  const unwrapBtn = document.getElementById("unwrapBtn")
  unwrapBtn.addEventListener("click",async ()=>await unwrapEthHandler())

  const shieldBtn = document.getElementById("shieldBtn")
  shieldBtn.addEventListener("click",async ()=>await shieldTokenBtnHandler())

}

async function refreshUiValues() {
  await setTickerUi()
  await setUserBalance()
  await showDeposits()

}


async function main() {
  console.log(`using circuit noir version: ${circuit.noir_version}, full obj: `,circuit)
  console.log(`using sunkenEthContractAddress: ${sunkEthContractAddress}`)
  setEventListeners()
  await refreshUiValues()



}
window.onload = main