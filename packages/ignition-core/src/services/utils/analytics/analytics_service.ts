import * as Sentry from "@sentry/node";
import dotenv from "dotenv";
import path from "path";

import { GlobalConfigService } from "../../config";
import { getIgnitionVersion } from "../package_info";

import { IErrorReporting } from "./index";

dotenv.config({
  path: path.resolve(`${__dirname}../../../.env.local`),
});

const SENTRY_DSN =
  "https://1b449353cf874d1d8dcba1e1f4fab394@o193824.ingest.sentry.io/5714032";

const GOOGLE_ANALYTICS_URL = "https://www.google-analytics.com/collect";
const GA_TRACKING_ID = "UA-125013494-5";

interface RawAnalytics {
  v: "1";
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

export class ErrorReporter implements IErrorReporting {
  private readonly _confirmedConsent: boolean = false;

  constructor(globalConfigService: GlobalConfigService) {
    if (process.env.IGNITION_ENV === "development") {
      return;
    }

    const confirmed = globalConfigService.checkConsent();
    if (!confirmed) {
      return;
    }

    this._confirmedConsent = confirmed;
    const ignitionVersion = getIgnitionVersion();
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: 1.0,
      release: `hardhat-ignition@${ignitionVersion}`,
    });
    Sentry.setExtra("nodeVersion", process.version);
  }

  public reportError(err: Error) {
    if (process.env.IGNITION_ENV === "development") {
      return;
    }

    if (!this._confirmedConsent) {
      return;
    }

    Sentry.captureException(err);
  }
}
