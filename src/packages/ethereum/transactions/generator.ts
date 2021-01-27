import { ContractBinding, TransactionData } from '../../../interfaces/mortar';
import { checkIfExist } from '../../utils/util';
import { Wallet, providers, BigNumber } from 'ethers';
import { ModuleState } from '../../modules/states/module';
import { SingleContractLinkReference } from '../../types/artifacts/libraries';
import { CliError } from '../../types/errors';
import { IGasCalculator, IGasPriceCalculator } from '../gas';
import { IConfigService } from '../../config';
import { INonceManager, ITransactionSigner } from './index';

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
  private readonly networkId: number;
  private nonceMap: { [address: string]: number };
  private nonceManager: INonceManager;
  private transactionSigner: ITransactionSigner;

  constructor(
    configService: IConfigService,
    gasPriceCalculator: IGasPriceCalculator,
    gasCalculator: IGasCalculator,
    networkId: number,
    ethers: providers.JsonRpcProvider,
    nonceManager: INonceManager,
    transactionSigner: ITransactionSigner
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
  }

  changeGasPriceCalculator(newGasPriceCalculator: IGasPriceCalculator) {
    this.gasPriceCalculator = newGasPriceCalculator;
  }

  changeNonceManager(newNonceManager: INonceManager) {
    this.nonceManager = newNonceManager;
  }

  changeTransactionSinger(newTransactionSinger: ITransactionSigner) {
    this.transactionSigner = newTransactionSinger;
  }

  initTx(moduleState: ModuleState): ModuleState {
    for (const [stateElementName, stateElement] of Object.entries(moduleState)) {
      if (stateElement instanceof ContractBinding) {
        if (checkIfExist(moduleState[stateElementName]?.txData)) {
          continue;
        }

        const rawTx: TransactionData = {
          input: undefined,
          output: undefined,
        };

        // @TODO: enable multiple address to send tx. HD wallet, address array
        rawTx.input = {
          from: this.wallet.address,
          input: stateElement.bytecode as string
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
    return {
      gasPrice: await this.gasPriceCalculator.getCurrentPrice(),
      nonce: await this.nonceManager.getTransactionCount(walletAddress),
    };
  }

  generateSingedTx(value: number, data: string, wallet?: Wallet | undefined): Promise<string> {
    return this.transactionSigner.generateSingedTx(value, data, wallet);
  }

  getTransactionCount(walletAddress: string): Promise<number> {
    return this.nonceManager.getTransactionCount(walletAddress);
  }
}
