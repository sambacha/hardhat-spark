import { BigNumber, ethers, providers } from "ethers";

import { ContractBinding } from "../../../interfaces/hardhat-ignition";
import { SingleContractLinkReference } from "../../types/artifacts/libraries";
import { GasPriceBackoff } from "../../types/config";
import { CliError, GasPriceBackoffError } from "../../types/errors";
import { ModuleState } from "../../types/module";
import { ILogging } from "../../utils/logging";
import { checkIfExist, delay } from "../../utils/util";
import { IGasCalculator, IGasPriceCalculator } from "../gas";

import {
  INonceManager,
  ITransactionGenerator,
  ITransactionSigner,
  TxMetaData,
} from "./index";

export class EthTxGenerator implements ITransactionGenerator {
  private _gasPriceCalculator: IGasPriceCalculator;
  private _gasCalculator: IGasCalculator;
  private readonly _provider: providers.JsonRpcProvider;
  private readonly _signer: ethers.Signer;
  private readonly _networkId: string;
  private _nonceMap: { [address: string]: number };
  private _nonceManager: INonceManager;
  private _transactionSigner: ITransactionSigner;
  private readonly _prompter: ILogging;
  private readonly _gasPriceBackoff: GasPriceBackoff | undefined;

  constructor(
    signer: ethers.Signer,
    gasPriceCalculator: IGasPriceCalculator,
    gasCalculator: IGasCalculator,
    networkId: string,
    provider: providers.JsonRpcProvider,
    nonceManager: INonceManager,
    transactionSigner: ITransactionSigner,
    prompter: ILogging,
    gasPriceBackoff?: GasPriceBackoff
  ) {
    this._provider = provider;

    this._signer = signer;
    this._gasPriceCalculator = gasPriceCalculator;
    this._gasCalculator = gasCalculator;
    this._networkId = networkId;
    this._nonceMap = {};
    this._nonceManager = nonceManager;
    this._transactionSigner = transactionSigner;
    this._prompter = prompter;
    this._gasPriceBackoff = gasPriceBackoff;
  }

  public changeGasPriceCalculator(newGasPriceCalculator: IGasPriceCalculator) {
    this._gasPriceCalculator = newGasPriceCalculator;
  }

  public changeNonceManager(newNonceManager: INonceManager) {
    this._nonceManager = newNonceManager;
  }

  public changeTransactionSigner(newTransactionSigner: ITransactionSigner) {
    this._transactionSigner = newTransactionSigner;
  }

  public async initTx(moduleState: ModuleState): Promise<ModuleState> {
    for (const [stateElementName, stateElement] of Object.entries(
      moduleState
    )) {
      if ((stateElement as ContractBinding)._isContractBinding) {
        if (checkIfExist(moduleState[stateElementName]?.txData)) {
          continue;
        }

        if (
          checkIfExist(
            (moduleState[stateElementName] as ContractBinding)?.deployMetaData
              .deploymentSpec?.deployFn
          )
        ) {
          continue;
        }

        moduleState[stateElementName].txData = {
          input: {
            from: await this._signer.getAddress(),
            input: (stateElement as ContractBinding).bytecode as string,
          },
          output: undefined,
        };
      }
    }

    return moduleState;
  }

  public addLibraryAddresses(
    bytecode: string,
    libraries: SingleContractLinkReference | undefined,
    moduleState: ModuleState
  ): string {
    if (libraries === undefined) {
      return bytecode;
    }

    for (const [libraryName, libraryOccurrences] of Object.entries(libraries)) {
      const contractAddress = (moduleState[libraryName] as ContractBinding)
        .deployMetaData?.contractAddress as string;
      if (!checkIfExist(contractAddress)) {
        throw new CliError(`Library is not deployed - ${libraryName}`);
      }

      for (const occurrence of libraryOccurrences) {
        const start = (occurrence.start + 1) * 2;
        const length = occurrence.length * 2;

        const firstPart = bytecode.slice(0, start);
        const secondPart = bytecode.slice(start + length);

        bytecode = firstPart.concat(contractAddress.substring(2), secondPart);
      }
    }

    return bytecode;
  }

  public async fetchTxData(walletAddress: string): Promise<TxMetaData> {
    let gasPrice = await this._gasPriceCalculator.getCurrentPrice();

    if (
      this._gasPriceBackoff !== undefined &&
      checkIfExist(this._gasPriceBackoff)
    ) {
      gasPrice = await this._fetchBackoffGasPrice(
        this._gasPriceBackoff.numberOfRetries
      );
    }

    return {
      gasPrice: gasPrice as BigNumber,
      nonce: await this._nonceManager.getAndIncrementTransactionCount(
        walletAddress
      ),
    };
  }

  public async generateSingedTx(
    value: number,
    data: string,
    signer?: ethers.Signer | undefined
  ): Promise<string> {
    return this._transactionSigner.generateSingedTx(value, data, signer);
  }

  public getAndIncrementTransactionCount(
    walletAddress: string
  ): Promise<number> {
    return this._nonceManager.getAndIncrementTransactionCount(walletAddress);
  }

  public async getCurrentTransactionCount(
    walletAddress: string
  ): Promise<number> {
    return this._nonceManager.getCurrentTransactionCount(walletAddress);
  }

  private async _fetchBackoffGasPrice(retries: number): Promise<BigNumber> {
    let gasPrice = await this._gasPriceCalculator.getCurrentPrice();
    if (this._gasPriceBackoff === undefined) {
      return gasPrice as BigNumber;
    }

    if (retries <= 0) {
      throw new GasPriceBackoffError(
        this._gasPriceBackoff.maxGasPrice.toString(),
        gasPrice.toString(),
        this._gasPriceBackoff.numberOfRetries,
        this._gasPriceBackoff.backoffTime
      );
    }
    if (checkIfExist(this._gasPriceBackoff)) {
      if (gasPrice.gt(this._gasPriceBackoff.maxGasPrice)) {
        this._prompter.gasPriceIsLarge(this._gasPriceBackoff.backoffTime);
        await delay(this._gasPriceBackoff.backoffTime);
        gasPrice = await this._fetchBackoffGasPrice(retries - 1);
      }
    }

    return gasPrice as BigNumber;
  }
}
