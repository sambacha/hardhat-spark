import { ContractBinding } from '../../../interfaces/hardhat_ignition';
import { checkIfExist, delay } from '../../utils/util';
import { BigNumber, ethers, providers } from 'ethers';
import { ModuleState } from '../../modules/states/module';
import { SingleContractLinkReference } from '../../types/artifacts/libraries';
import { CliError, GasPriceBackoffError } from '../../types/errors';
import { IGasCalculator, IGasPriceCalculator } from '../gas';
import { INonceManager, ITransactionSigner } from './index';
import { GasPriceBackoff } from '../../types/config';
import { ILogging } from '../../utils/logging';

export type TxMetaData = {
  gasPrice?: BigNumber;
  nonce?: number;
};

export class EthTxGenerator implements INonceManager, ITransactionSigner {
  private gasPriceCalculator: IGasPriceCalculator;
  private gasCalculator: IGasCalculator;
  private readonly provider: providers.JsonRpcProvider;
  private readonly signer: ethers.Signer;
  private readonly networkId: string;
  private nonceMap: { [address: string]: number };
  private nonceManager: INonceManager;
  private transactionSigner: ITransactionSigner;
  private readonly prompter: ILogging;
  private readonly gasPriceBackoff: GasPriceBackoff | undefined;

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
    this.provider = provider;

    this.signer = signer;
    this.gasPriceCalculator = gasPriceCalculator;
    this.gasCalculator = gasCalculator;
    this.networkId = networkId;
    this.nonceMap = {};
    this.nonceManager = nonceManager;
    this.transactionSigner = transactionSigner;
    this.prompter = prompter;
    this.gasPriceBackoff = gasPriceBackoff;
  }

  changeGasPriceCalculator(newGasPriceCalculator: IGasPriceCalculator) {
    this.gasPriceCalculator = newGasPriceCalculator;
  }

  changeNonceManager(newNonceManager: INonceManager) {
    this.nonceManager = newNonceManager;
  }

  changeTransactionSigner(newTransactionSigner: ITransactionSigner) {
    this.transactionSigner = newTransactionSigner;
  }

  async initTx(moduleState: ModuleState): Promise<ModuleState> {
    for (const [stateElementName, stateElement] of Object.entries(
      moduleState
    )) {
      if ((stateElement as ContractBinding)._isContractBinding) {
        if (checkIfExist(moduleState[stateElementName]?.txData)) {
          continue;
        }

        moduleState[stateElementName].txData = {
          input: {
            from: await this.signer.getAddress(),
            input: (stateElement as ContractBinding).bytecode as string,
          },
          output: undefined,
        };
      }
    }

    return moduleState;
  }

  addLibraryAddresses(
    bytecode: string,
    binding: ContractBinding,
    moduleState: ModuleState
  ): string {
    const libraries = binding.libraries as SingleContractLinkReference;

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

  async fetchTxData(walletAddress: string): Promise<TxMetaData> {
    let gasPrice = await this.gasPriceCalculator.getCurrentPrice();

    if (this.gasPriceBackoff && checkIfExist(this.gasPriceBackoff)) {
      gasPrice = await this.fetchBackoffGasPrice(
        this.gasPriceBackoff.numberOfRetries
      );
    }

    return {
      gasPrice: gasPrice as BigNumber,
      nonce: await this.nonceManager.getAndIncrementTransactionCount(
        walletAddress
      ),
    };
  }

  private async fetchBackoffGasPrice(retries: number): Promise<BigNumber> {
    let gasPrice = await this.gasPriceCalculator.getCurrentPrice();
    if (!this.gasPriceBackoff) {
      return gasPrice as BigNumber;
    }

    if (retries <= 0) {
      throw new GasPriceBackoffError(
        this.gasPriceBackoff.maxGasPrice.toString(),
        gasPrice.toString(),
        this.gasPriceBackoff.numberOfRetries,
        this.gasPriceBackoff.backoffTime
      );
    }
    if (checkIfExist(this.gasPriceBackoff)) {
      if (gasPrice > this.gasPriceBackoff.maxGasPrice) {
        this.prompter.gasPriceIsLarge(this.gasPriceBackoff.backoffTime);
        await delay(this.gasPriceBackoff.backoffTime);
        gasPrice = await this.fetchBackoffGasPrice(retries - 1);
      }
    }

    return gasPrice as BigNumber;
  }

  async generateSingedTx(
    value: number,
    data: string,
    signer?: ethers.Signer | undefined
  ): Promise<string> {
    return this.transactionSigner.generateSingedTx(value, data, signer);
  }

  getAndIncrementTransactionCount(walletAddress: string): Promise<number> {
    return this.nonceManager.getAndIncrementTransactionCount(walletAddress);
  }

  async getCurrentTransactionCount(walletAddress: string): Promise<number> {
    return this.nonceManager.getCurrentTransactionCount(walletAddress);
  }
}
