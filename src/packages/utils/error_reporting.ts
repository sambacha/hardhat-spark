import * as Sentry from '@sentry/node';
import { GlobalConfigService } from '../config/global_config_service';
import path from 'path';
import { getIgnitionVersion } from './package_info';

require('dotenv').config({path: path.resolve(__dirname + '../../../.env.local')});

const SENTRY_DSN = 'https://1b449353cf874d1d8dcba1e1f4fab394@o193824.ingest.sentry.io/5714032';

export class ErrorReporting {
  private readonly confirmedConsent: boolean = false;

  constructor(globalConfigService: GlobalConfigService) {
    if (process.env.IGNITION_ENV == 'development') {
      return;
    }

    const confirmed = globalConfigService.checkConsent();
    if (!confirmed) {
      return;
    }

    this.confirmedConsent = confirmed;
    const ignitionVersion = getIgnitionVersion();
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: 1.0,
      release: `hardhat-ignition@${ignitionVersion}`,
    });
    Sentry.setExtra('nodeVersion', process.version);
  }

  reportError(err: Error) {
    if (process.env.IGNITION_ENV == 'development') {
      return;
    }

    if (!this.confirmedConsent) {
      return;
    }

    Sentry.captureException(err);
  }
}
