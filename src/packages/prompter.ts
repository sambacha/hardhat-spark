import cli from 'cli-ux';
import { DeniedConfirmation } from './types/errors';

export class Prompter {
  private readonly skipConfirmation: boolean;

  constructor(skipConfirmation: boolean = false) {
    this.skipConfirmation = skipConfirmation;
  }

  async promptContinueDeployment(): Promise<void> {
    if (this.skipConfirmation) {
      return;
    }

    const con = await cli.prompt('Do you wish to continue with deployment of this module? (Y/n)', {
      required: false
    });
    if (con == 'n') {
      throw new DeniedConfirmation('Confirmation has been declined.');
    }
  }

  async promptContinueToNextBinding(): Promise<void> {
    if (this.skipConfirmation) {
      return;
    }

    const con = await cli.prompt('Do you wish to continue to the next binding? (Y/n)', {
      required: false
    });
    if (con == 'n') {
      throw new DeniedConfirmation('Confirmation has been declined.');
    }
  }

  async promptExecuteTx(): Promise<void> {
    if (this.skipConfirmation) {
      return;
    }

    const con = await cli.prompt('Execute transactions? (Y/n)', {
      required: false
    });
    if (con == 'n') {
      throw new DeniedConfirmation('Confirmation has been declined.');
    }
  }

  promptSignedTransaction(tx: string): void {
    cli.debug(`Signed transaction: ${tx}`);
  }

  errorPrompt(error: Error): void {
    cli.error(error);
  }

  sendingTx(): void {
    cli.action.start('Sending tx');
  }

  sentTx(): void {
    cli.action.stop('sent');
  }

  transactionReceipt(): void {
    cli.info('Waiting for block confirmation...');
  }

  waitTransactionConfirmation(): void {
    cli.action.start('Block is mining');
  }

  transactionConfirmation(confirmationNumber: number): void {
    cli.action.stop(`\n Current block confirmation: ${confirmationNumber}`);
  }
}
