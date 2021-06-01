import { ethers } from "ethers";

export class EthClient {
  private readonly _provider: ethers.providers.JsonRpcProvider;
  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._provider = provider;
  }

  public getCode(
    contractAddress: string,
    blockNumber?: string | number
  ): Promise<string> {
    return this._provider.getCode(contractAddress, blockNumber);
  }
}
