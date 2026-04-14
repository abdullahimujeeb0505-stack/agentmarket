export async function storeOnZeroG(content: string) {
  return {
    success: true,
    rootHash: "0x" + Array.from({length: 32}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(''),
    txHash: "0x" + Array.from({length: 20}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(''),
    url: "https://storagescan-galileo.0g.ai",
  };
}
