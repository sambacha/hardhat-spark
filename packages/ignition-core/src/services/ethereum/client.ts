import { ethers } from "ethers";

export class EthClient {
  private readonly provider: ethers.providers.JsonRpcProvider;
  constructor(provider: ethers.providers.JsonRpcProvider) {
    this.provider = provider;
  }

  public getCode(
    contractAddress: string,
    blockNumber?: string | number
  ): Promise<string> {
    return this.provider.getCode(contractAddress, blockNumber);
  }
}
