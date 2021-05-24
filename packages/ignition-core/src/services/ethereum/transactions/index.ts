import { BigNumber, ethers } from "ethers";

import { SingleContractLinkReference } from "../../types/artifacts/libraries";
import { ModuleState } from "../../types/module";
import { IGasPriceCalculator } from "../gas";

export interface TxMetaData {
  gasPrice?: BigNumber;
  nonce?: number;
}

export interface INonceManager {
  getAndIncrementTransactionCount(walletAddress: string): Promise<number>;
  getCurrentTransactionCount(walletAddress: string): Promise<number>;
}

export interface ITransactionSigner {
  generateSingedTx(
    value: number,
    data: string,
    signer?: ethers.Signer | undefined
  ): Promise<string>;
}

export interface ITransactionGenerator
  extends INonceManager,
    ITransactionSigner {
  fetchTxData(walletAddress: string): Promise<TxMetaData>;
  addLibraryAddresses(
    bytecode: string,
    libraries: SingleContractLinkReference | undefined,
    moduleState: ModuleState
  ): string;
  initTx(moduleState: ModuleState): Promise<ModuleState>;
  changeTransactionSigner(newTransactionSigner: ITransactionSigner): void;
  changeNonceManager(newNonceManager: INonceManager): void;
  changeGasPriceCalculator(newGasPriceCalculator: IGasPriceCalculator): void;
}
