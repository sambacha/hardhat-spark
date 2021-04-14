import * as Sentry from '@sentry/node';
import { GlobalConfigService } from '../../config/global_config_service';
import path from 'path';
import { getIgnitionVersion } from '../package_info';
import qs from 'qs';
import uuid from 'uuid/v4';
import fetch from 'node-fetch';
import { checkIfExist, getUserAgent, getUserType } from '../util';
import { readAnalyticsId } from './analytics_util';
import {
  readFirstLegacyAnalyticsId,
  readSecondLegacyAnalyticsId,
  writeAnalyticsId
} from 'hardhat/internal/util/global-dir';
import { IAnalyticsService } from './index';

require('dotenv').config({path: path.resolve(__dirname + '../../../../.env.local')});

const SENTRY_DSN = 'https://1b449353cf874d1d8dcba1e1f4fab394@o193824.ingest.sentry.io/5714032';

const GOOGLE_ANALYTICS_URL = 'https://www.google-analytics.com/collect';
const GA_TRACKING_ID = 'UA-125013494-5';

interface RawAnalytics {
  v: '1';
  tid: string;
  cid: string;
  dp: string;
  dh: string;
  t: string;
  ua: string;
  cs: string;
  cm: string;
  cd1: string;
  cd2: string;
  cd3: string;
}

export class AnalyticsService implements IAnalyticsService {
  private readonly confirmedConsent: boolean = false;
  private clientId: string;
  private readonly userType: string;

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
    this.userType = getUserType();
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

  public async sendCommandHit(
    taskName: string
  ): Promise<Response | any> {
    if (process.env.IGNITION_ENV == 'development') {
      return;
    }

    if (!this.confirmedConsent) {
      return Promise.resolve();
    }

    return AnalyticsService._sendHit(await this._taskHit(taskName));
  }

  private async _taskHit(taskName: string): Promise<RawAnalytics> {
    if (!checkIfExist(this.clientId)) {
      this.clientId = await AnalyticsService.getClientId();
    }

    return {
      v: '1',
      t: 'pageview',
      tid: GA_TRACKING_ID,
      cid: this.clientId,
      dp: `/task/${taskName}`,
      dh: 'cli.ignition.hardhat.org',
      ua: getUserAgent(),
      cs: this.userType,
      cm: 'User Type',
      cd1: 'hardhat-ignition',
      cd2: this.userType,
      cd3: await getIgnitionVersion(),
    };
  }

  private static async _sendHit(hit: RawAnalytics): Promise<void> {
    const hitPayload = qs.stringify(hit);

    await fetch(GOOGLE_ANALYTICS_URL, {
      body: hitPayload,
      method: 'POST',
    });
  }

  private static async getClientId(): Promise<string> {
    let clientId = await readAnalyticsId();

    if (clientId === undefined) {
      clientId =
        (await readSecondLegacyAnalyticsId()) ??
        (await readFirstLegacyAnalyticsId());

      if (clientId === undefined) {
        clientId = uuid();
      }

      await writeAnalyticsId(clientId);
    }

    return clientId;
  }
}
