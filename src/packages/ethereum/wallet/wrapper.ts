import { Namespace } from 'cls-hooked';
import { ethers } from 'ethers';
import { MortarWallet } from '../../../interfaces/mortar';
import { ModuleStateRepo } from '../../modules/states/state_repo';
import { INonceManager } from '../transactions';
import { IGasCalculator, IGasPriceCalculator } from '../gas';
import { IPrompter } from '../../utils/promter';
import { EventTxExecutor } from '../transactions/event_executor';

export class WalletWrapper {
  private readonly eventSession: Namespace;
  private readonly moduleStateRepo: ModuleStateRepo;
  private readonly nonceManager: INonceManager;
  private readonly gasPriceCalculator: IGasPriceCalculator;
  private readonly gasCalculator: IGasCalculator;
  private readonly prompter: IPrompter;
  private readonly eventTxExecutor: EventTxExecutor;

  constructor(
    eventSession: Namespace,
    nonceManager: INonceManager,
    gasPriceCalculator: IGasPriceCalculator,
    gasCalculator: IGasCalculator,
    moduleStateRepo: ModuleStateRepo,
    prompter: IPrompter,
    eventTxExecutor: EventTxExecutor
  ) {
    this.eventSession = eventSession;
    this.nonceManager = nonceManager;
    this.gasPriceCalculator = gasPriceCalculator;
    this.gasCalculator = gasCalculator;
    this.moduleStateRepo = moduleStateRepo;
    this.prompter = prompter;
    this.eventTxExecutor = eventTxExecutor;
  }

  wrapWallets(wallets: ethers.Wallet[]): MortarWallet[] {
    const mortarWallets = [];
    for (const wallet of wallets) {
      mortarWallets.push(
        new MortarWallet(
          wallet,
          this.eventSession,
          this.nonceManager,
          this.gasPriceCalculator,
          this.gasCalculator,
          this.moduleStateRepo,
          this.prompter,
          this.eventTxExecutor
        )
      );
    }

    return mortarWallets;
  }
}
