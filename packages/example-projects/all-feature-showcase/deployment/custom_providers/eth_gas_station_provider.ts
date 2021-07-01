import { BigNumber } from "@ethersproject/bignumber";
import axios from "axios";
import { IGasPriceCalculator } from "ignition-core";

export enum GasPriceType {
  "fast" = "fast",
  "fastest" = "fastest",
  "safeLow" = "safeLow",
  "average" = "average",
}

export class EthGasStationProvider implements IGasPriceCalculator {
  private readonly _apiKey: string;
  private readonly _gasPriceType: GasPriceType;

  constructor(apiKey: string, type: GasPriceType) {
    this._apiKey = apiKey;
    this._gasPriceType = type;
  }

  public async getCurrentPrice(): Promise<BigNumber> {
    const url = `https://ethgasstation.info/api/ethgasAPI.json?api-key=${this._apiKey}`;

    const resp = await axios.get(url);

    const data = resp.data;

    return data[this._gasPriceType];
  }
}
