import { ContractBinding, TransactionData } from '../../../interfaces/hardhat_ignition';
import { checkIfExist, delay } from '../../utils/util';
import { Wallet, providers, BigNumber } from 'ethers';
import { ModuleState } from '../../modules/states/module';
import { SingleContractLinkReference } from '../../types/artifacts/libraries';
import { CliError, GasPriceBackoffError } from '../../types/errors';
import { IGasCalculator, IGasPriceCalculator } from '../gas';
import { IConfigService } from '../../config';
import { INonceManager, ITransactionSigner } from './index';
import { GasPriceBackoff } from '../../types/config';
import { ILogging } from '../../utils/logging';

export type TxMetaData = {
  gasPrice?: BigNumber;
  nonce?: number
};

export class EthTxGenerator implements INonceManager, ITransactionSigner {
  private configService: IConfigService;
  private gasPriceCalculator: IGasPriceCalculator;
  private gasCalculator: IGasCalculator;
  private readonly ethers: providers.JsonRpcProvider;
  private readonly wallet: Wallet;
  private readonly networkId: string;
  private nonceMap: { [address: string]: number };
  private nonceManager: INonceManager;
  private transactionSigner: ITransactionSigner;
  private readonly prompter: ILogging;
  private readonly gasPriceBackoff: GasPriceBackoff | undefined;

  constructor(
    configService: IConfigService,
    gasPriceCalculator: IGasPriceCalculator,
    gasCalculator: IGasCalculator,
    networkId: string,
    ethers: providers.JsonRpcProvider,
    nonceManager: INonceManager,
    transactionSigner: ITransactionSigner,
    prompter: ILogging,
    gasPriceBackoff?: GasPriceBackoff,
  ) {
    this.configService = configService;
    this.ethers = ethers;

    this.wallet = new Wallet(this.configService.getFirstPrivateKey(), this.ethers);
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

  initTx(moduleState: ModuleState): ModuleState {
    for (const [stateElementName, stateElement] of Object.entries(moduleState)) {
      if ((stateElement as ContractBinding)._isContractBinding) {
        if (checkIfExist(moduleState[stateElementName]?.txData)) {
          continue;
        }

        const rawTx: TransactionData = {
          input: undefined,
          output: undefined,
        };

        rawTx.input = {
          from: this.wallet.address,
          input: (stateElement as ContractBinding).bytecode as string
        };

        moduleState[stateElementName].txData = rawTx;
      }
    }

    return moduleState;
  }

  addLibraryAddresses(bytecode: string, binding: ContractBinding, moduleState: ModuleState): string {
    const libraries = binding.libraries as SingleContractLinkReference;

    for (const [libraryName, libraryOccurrences] of Object.entries(libraries)) {
      const contractAddress = (moduleState[libraryName] as ContractBinding).deployMetaData?.contractAddress as string;
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
    if (checkIfExist(this.gasPriceBackoff)) {
      gasPrice = await this.fetchBackoffGasPrice(this.gasPriceBackoff.numberOfRetries);
    }

    return {
      gasPrice: gasPrice,
      nonce: await this.nonceManager.getAndIncrementTransactionCount(walletAddress),
    };
  }

  private async fetchBackoffGasPrice(retries: number): Promise<BigNumber> {
    let gasPrice = await this.gasPriceCalculator.getCurrentPrice();
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

    return gasPrice;
  }

  generateSingedTx(value: number, data: string, wallet?: Wallet | undefined): Promise<string> {
    return this.transactionSigner.generateSingedTx(value, data, wallet);
  }

  getAndIncrementTransactionCount(walletAddress: string): Promise<number> {
    return this.nonceManager.getAndIncrementTransactionCount(walletAddress);
  }

  async getCurrentTransactionCount(walletAddress: string): Promise<number> {
    return this.nonceManager.getCurrentTransactionCount(walletAddress);
  }
}
