import * as web3utils from 'web3-utils';

export function splitArrayIntoChunks(array: any[], chunkSize: number) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize);
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

export const toBytes32 = (key: string) => web3utils.rightPad(web3utils.asciiToHex(key), 64);
