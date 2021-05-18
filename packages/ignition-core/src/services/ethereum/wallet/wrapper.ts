import { Namespace } from 'cls-hooked';
import { ethers } from 'ethers';
import { IgnitionSigner } from '../../../interfaces/hardhat_ignition';
import { ModuleStateRepo } from '../../modules/states/state_repo';
import { INonceManager } from '../transactions';
import { IGasCalculator, IGasPriceCalculator } from '../gas';
import { ILogging } from '../../utils/logging';
import { EventTxExecutor } from '../transactions';

export class WalletWrapper {
  private readonly eventSession: Namespace;
  private readonly moduleStateRepo: ModuleStateRepo;
  private readonly nonceManager: INonceManager;
  private readonly gasPriceCalculator: IGasPriceCalculator;
  private readonly gasCalculator: IGasCalculator;
  private readonly prompter: ILogging;
  private readonly eventTxExecutor: EventTxExecutor;

  constructor(
    eventSession: Namespace,
    nonceManager: INonceManager,
    gasPriceCalculator: IGasPriceCalculator,
    gasCalculator: IGasCalculator,
    moduleStateRepo: ModuleStateRepo,
    prompter: ILogging,
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

  wrapSigners(signers: ethers.Signer[]): IgnitionSigner[] {
    const ignitionWallets = [];
    for (const signer of signers) {
      ignitionWallets.push(
        new IgnitionSigner(
          signer,
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

    return ignitionWallets;
  }
}
