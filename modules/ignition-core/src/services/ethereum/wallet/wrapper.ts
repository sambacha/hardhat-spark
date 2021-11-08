import { Namespace } from "cls-hooked";
import { ethers } from "ethers";

import { IgnitionSigner } from "../../../interfaces/hardhat-ignition";
import { ModuleStateRepo } from "../../modules/states/repo/state-repo";
import { ILogging } from "../../utils/logging";
import { IGasCalculator, IGasPriceCalculator } from "../gas";
import { INonceManager } from "../transactions";
import { EventTxExecutor } from "../transactions/event-executor";

export class WalletWrapper {
  private readonly _eventSession: Namespace;
  private readonly _moduleStateRepo: ModuleStateRepo;
  private readonly _nonceManager: INonceManager;
  private readonly _gasPriceCalculator: IGasPriceCalculator;
  private readonly _gasCalculator: IGasCalculator;
  private readonly _prompter: ILogging;
  private readonly _eventTxExecutor: EventTxExecutor;

  constructor(
    eventSession: Namespace,
    nonceManager: INonceManager,
    gasPriceCalculator: IGasPriceCalculator,
    gasCalculator: IGasCalculator,
    moduleStateRepo: ModuleStateRepo,
    prompter: ILogging,
    eventTxExecutor: EventTxExecutor
  ) {
    this._eventSession = eventSession;
    this._nonceManager = nonceManager;
    this._gasPriceCalculator = gasPriceCalculator;
    this._gasCalculator = gasCalculator;
    this._moduleStateRepo = moduleStateRepo;
    this._prompter = prompter;
    this._eventTxExecutor = eventTxExecutor;
  }

  public wrapSigners(signers: ethers.Signer[]): IgnitionSigner[] {
    const ignitionWallets = [];
    for (const signer of signers) {
      ignitionWallets.push(
        new IgnitionSigner(
          signer,
          this._eventSession,
          this._nonceManager,
          this._gasPriceCalculator,
          this._gasCalculator,
          this._moduleStateRepo,
          this._prompter,
          this._eventTxExecutor
        )
      );
    }

    return ignitionWallets;
  }
}
