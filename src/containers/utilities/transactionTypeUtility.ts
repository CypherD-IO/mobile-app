import Web3 from 'web3';

export default async function getTransactionType(address: string) {
  const ETH_RPC_URL = 'https://rpc.ankr.com/eth';
  const web3 = new Web3(ETH_RPC_URL);
  try {
    const bytecodeHex = await web3.eth.getCode(address);
    let type;
    if (bytecodeHex === '0x' || bytecodeHex === '0x0') {
      // 0x0 on Ganache
      type = 'EOA';
    } else {
      const bytecode = web3.utils.hexToAscii(bytecodeHex);
      if (bytecode.includes('ERC20')) {
        type = 'ERC20_Contract';
      } else if (bytecode.includes('ERC1155')) {
        type = 'ERC1155_Contract';
      } else if (
        bytecode.includes('balanceOf') ||
        bytecode.includes('ownerOf') ||
        bytecode.includes('transferFrom')
      ) {
        type = 'ERC721_Contract';
      } else if (
        bytecode.includes('ERC777TokensRecipient') ||
        bytecode.includes('ERC777TokensSender')
      ) {
        type = 'ERC777_Contract';
      } else {
        // Note: getting standard from byte code doesn't cover all variations of contracts
        type = 'Contract';
      }
    }
    return type;
  } catch (e) {
    throw Error(JSON.stringify({ message: String(e), errorAddress: address }));
  }
}
