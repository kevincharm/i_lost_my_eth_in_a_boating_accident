import  {BarretenbergBackend} from '@noir-lang/backend_barretenberg';
import { Noir, blake2s256 } from '@noir-lang/noir_js';
// window.Noir = Noir
// window.blake2s256 = blake2s256
import {assert, ethers, wordlists} from 'ethers'
//import circuit from "../circuit/target/circuit.json"
const circuit ={"noir_version":"TODO"}
import { SunkEthInteracter } from './src/SunkEthInteracter';
//const sunkETHABI =["function decimals() view returns (uint8)","function symbol() view returns (string)","function balanceOf(address owner) view returns (uint256)","function transfer(address to, uint amount) returns (bool)"]

import {toUnspendableAddress} from '../scripts/toUnspendableAddress'

// const sunkEthContractAddress = "0xe8a72A49cD5FDbFbe16194A197642a0cE7C53b48"
import packageConfig from './package.json';
const sunkEthContractAddress =  packageConfig.config.sunkEthContractAddress

//debug
window.SunkEthInteracter = SunkEthInteracter
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

  const SECRET_KEY = '0xbc005f65414869c630b7ae67836847f46f9083a9cd84af3f01969031309e5c1d'
  const burnAddress = toUnspendableAddress(SECRET_KEY)
  const BALANCE_TO_BURN = ethers.parseEther('0.069420')
  // const deposits = {[burnAddress]:{
  //   amount: BALANCE_TO_BURN,
  //   nullifierData: {secret: SECRET_KEY},
  //   isClaimed: false
  // }}
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
  // const hardCodedSnarkProof = "0x"+"19c5e8a75a4eb3a315a60b17db6594bd222c336d93500ff52d07374a82f7d907085fd9f9cc18c5bfff6b8781cce50df208d481d48a07ab529bf958105546435009beb8a4aa1ea84c17f4a10d6ddc94c5034afd07979782f4be80353a9adcdbe22e96e883cc6bd829adafda6dd6dc9c917845d8fab8a1b78f7de77886cbc3d82e27c7155110879507713e46ce4f2e5defd6b1f2c5552f123d6356031b9c2dae3c0b9499c8b99174ca3f280ac16eefac9ca60cb3d32bb0181d9e41f0468397069f2c1c3c1a042c56a83e1aba8e9ac3e2b283ff1f7968394b973718df351237b003278c0f09cf4fd6a8ee21e24908a8fdd339a969595dcb2f7ee350b7487bce894925af3205a952fc18a60f35baf5057e2330cfb7e0e6966a42c11ea856b929897f09fe91114fbccf021f995354f10badaf178510d463f11e17ca55eecc5312e04108eeaa3195de1a0d1b2342c5efaf1511607c4ecaf6d20b5e934240ccd433a4ff2b72b927f2cf5e4fbe6c422d45eec2afc71035a4c99771c820bf2c179984d4ef07aa5840b2af6bc0a783c2ad861f2de3c98db73fc96d7a44247dc732001cb6a12da3f4d791a2c85022cfffbe5eb7ce88c9ee3e631a2efc432497f483536eb5030af238409c150b2e074e1fd37f01415124f1a8bb96b5fcadb0ed79ad421655be246b6cce980c217971dccafa70bbd67cf7d39cb8100bd7d246c605d74611fb3b1d901ff4f4d564ca95c59ac721cd334e538d7688d883c06fd31002aace2d9bee2aee1ef6586ccfeda909208482f46d7d43e48f181bf71cbe841b96d05594ca831291514caab7e2e763e5bc04b4bb8d902c788cc8e5b9999050f314e41fdf1b6e2e7754ee05bfc120bc44647411de7d33565663b90b517a26ea45782c1a5efd330dc18cd7694eed7dc07189ee7f88bd1cfec5b9ceff4960308839f6e6c8c2ae0a2d1b94871e0972ab4a871f633da2ba9d237ae1540d0f8d00bb9a96484822bb7002093fa39c9af01f3e49a18edd595189876a3ddee7ebebec7831cb34953707922883ff21592606cf7d7b8acd955520a53624214f4d8d5c5bca9c8f6e8def7df90df5c755978461e276a0de17f04a6b7d82a99058b30d964f27abf487a3a1b8862ed7ae13abc9bd95ad4e2a58b41a10d82f36b651e6937a31d601fb123c2131aa28db0856d5f0bad909094714b910800aaebd30e4b8ad3784ffc01b0e8ab4fb72239d87cc35c28743a60b3157fb8f61ff1301d00ab0992e6b59063b9bde2bfeaa091aa5228e01d3a7d62d7c41965072209509b53d9d88d745502215a707cd57dd22a26dd0609ab580b2ae277c5235d4e26fe3fa1797b72ebc36d3cba9a5cafa3d1fc305e674876509b86290c54cd47194e0b31f71e7b2ec0e4a1072d8810ec2ac1a50dcbe69852b1c733571721fd5fc41064fbe0e729fdaa4c98636b638590e73218d2e72079158c10f000c22a45087f731cda7d5a9c3267326293b02c09047dd24d3258694dfbf610cdb33226dc57b0241423bf63044d6f2d4f31564c64a91031fc7c819edb0df0dda31ad19c03c941957f95a0c1faf4305275a4da6098b400403e1744388d0db2761aec7df9e1be798a808c45d206e6352588005a75a2ba08e219d4e8ff01983fabf196287fc7f2d58955a9c8bc00715581c13e5e54a9e31281804bd2b165b0940ee3cb86ec04ea5967fd0d5a04e9246817b5dd5eec8bc2a1726c6638a90bcb1c109439806519a6df14184e5e143103793269dc95a5f7400e91a901876260765cebc8e29759f13a5910707982c78af7b6be32fc38aa13fda2f293b59a27209324c52201cd2b00e01e6f3f32e6e85369be2c251d847f8e062c10d7780ec149845cd9cefa641f9d43a90452551100d2dde6c28ff376f12f6c64718c964aadf0fe241fc6438a81d70d9fd3195bcf1bfeb92a65196155ae152654124af44a78e9f203efa078c9e6e18267931dc1dac0d6b2f3b78d9a7038ef500c1300a9344feddd8906895f741ec02144c9f65e98e971d3083c2c67cc7a66de83e0950093365058ff618b16a9dcb570e57c99ddd28375cd719a941addd5f75f7b81c8e01772b6366d5f51bbe045d7d4fe352283fe0629ee9e63e2ba45026addde62e5eeb4cf8feeee1314950e2650fb4e06f54dc98b7bc57218acc8c33361512aa2df25575ac41e977bdc141f191e88946e7d54be776d9506d72fe43265ed77477203e40c8e6960feeeeb1ca3093e817fa4464fe8e035b7c3f353dca9fbdb69ca1039fb4699096be77cf4f4b488c81590dfa11cf6b257f5d95692e0de20c3350af0e4553074de2fc688d6c52635443de68633c5f1e2ede43e6c3b5243f77d802bd054ea137d889c490638d7ad1d3a596713e78c378328f4478c5fbe20d5619619a0f8ba40c482aa654739490d485954bfda8d56d458e9797d9711d28d984e2e8e627903c689896b06a9ddf6cf42ccf23ae4ba3a1b35f2824d659e8f20f15c9934d1ffc5adaf87b54726c39402cd5f5db95f89d0933d89d405e903838c64cff7f45026515661cf6806b8a6ce57b9b53a8405c347e646d70902b3aa5e7ac66fa44b60b7ca04b95c51678d1115f22327b416ed4fab1059ae820e05c69fa5226bf783e03809475fd0015eb36be86294e47521856ac55b23ed633362ee3f17e4549ffec17abf7a8bf01f34fd97f112802a05c595f9ce4211c364c8fd159c0cb7cbe74ed1b3aaa4baa5b7220c72b4d53f807acf59cf19f6d1ab53cd951388f2dcb15109504151c48571a1ffabcb18c485177f95c91707ab9fb1aa7b24d791dbba317c02c22a915e8610b2820b0995c92f1eb7b82841cf82bb705aea0595e6a6e16fa19b326a75ffc3f455218e464340cf88714032ffd684faa1aec20f9794f49648ce3ea2527bd98dfb83ab71087504e3eb83f7b24673bb1383877d835953ddf3631dc5a00fe9a2d994ef749736dd196512fb80bbfe63556ce2560a47484ebfb72d27e601405c717dbf614aae1e10d8a704278ec9d79e9a73337c76db02bc2dda3e6c2cb"
  // const secret = "0xf986d0f3842ff6a98a1ee59350fec002f4c5983413745711081bf3e5aadedb6e"
  // const blockNumber = 5837118

  
  const provider = getBrowserProvider()
  const blockNumber = (await provider.getBlock()).number
  const secret = ethers.hexlify(nullifierData.secret)
  const tx  = await sunkEthInteracter.unShieldTokens(secret,blockNumber)
  console.log(await tx.wait(1))
  await refreshUiValues()
}

async function unshieldHandlerExternalProofHandler() {
  const {sunkEthInteracter} = await connectWallet()



  const proof = "0x" +  document.getElementById("proof").value
  const secret = document.getElementById("secret").value
  const blockNumber = Number(document.getElementById("blockNumber").value)
  console.log(secret,blockNumber, proof)
  const tx  = await sunkEthInteracter.unShieldTokens(secret,blockNumber, proof)
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

  const remintExternalProofBtn = document.getElementById("remintExternalProof")
  remintExternalProofBtn.addEventListener("click", async () => await unshieldHandlerExternalProofHandler())

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