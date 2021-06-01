import AWS from "aws-sdk";

import { checkIfExist } from "../../../utils/util";

import {
  IModuleRegistryResolver,
  ModuleRegistryResolver,
  REGISTRY_NAME,
} from "./index";

export class RemoteBucketStorage implements IModuleRegistryResolver {
  private _s3: AWS.S3;
  private readonly _bucketName: string;
  private readonly _accessKey: string;
  private readonly _version: string;
  private _registryFile: ModuleRegistryResolver;

  constructor(
    endpoint: string,
    region: string,
    bucketName: string,
    accessKey: string = "",
    secretAccessKey: string = "",
    version: string = "v0.0.1"
  ) {
    this._bucketName = bucketName;
    this._accessKey = accessKey;
    this._version = version;
    this._registryFile = {};

    this._s3 = new AWS.S3({
      region,
      credentials: new AWS.Credentials({
        accessKeyId: accessKey,
        secretAccessKey,
        sessionToken: "",
      }),
      endpoint,
    });
  }

  public async resolveContract(
    networkId: string,
    moduleName: string,
    bindingName: string
  ): Promise<string> {
    try {
      if (!checkIfExist(this._registryFile[this._version])) {
        this._registryFile = await this._getRemoteRegistry(
          moduleName,
          networkId
        );
      }

      return this._registryFile[this._version][bindingName];
    } catch (err) {
      if (err.statusCode === 404) {
        return "";
      }

      throw err;
    }
  }

  public async setAddress(
    networkId: string,
    moduleName: string,
    bindingName: string,
    contractAddress: string
  ): Promise<boolean> {
    if (contractAddress === "") {
      return true;
    }

    try {
      if (!checkIfExist(this._registryFile)) {
        this._registryFile = await this._getRemoteRegistry(
          moduleName,
          networkId
        );
      }
    } catch (err) {
      if (err?.statusCode !== 404) {
        throw err;
      }
    }
    if (!checkIfExist(this._registryFile[this._version])) {
      this._registryFile[this._version] = {};
    }
    this._registryFile[this._version][bindingName] = contractAddress;

    const params: AWS.S3.Types.PutObjectRequest = {
      Bucket: this._bucketName,
      Key: `${moduleName}_${networkId}_${REGISTRY_NAME}`,
      Body: JSON.stringify(this._registryFile, undefined, 4),
    };

    await this._s3.upload(params).promise();

    return true;
  }

  private async _getRemoteRegistry(
    moduleName: string,
    networkId: string
  ): Promise<ModuleRegistryResolver> {
    const req = this._s3.getObject({
      Bucket: this._bucketName,
      Key: `${moduleName}_${networkId}_${REGISTRY_NAME}`,
    });

    req.on("sign", () => {
      if (
        req.httpRequest.headers.Authorization === undefined &&
        this._accessKey !== undefined
      ) {
        req.httpRequest.headers.Authorization = `Credential=${this._accessKey}`;

        return;
      }

      if (this._accessKey === "") {
        delete req.httpRequest.headers.Authorization;
        req.httpRequest.headers["public-read"] = "public-read";

        return;
      }

      req.httpRequest.headers.Authorization = req.httpRequest.headers.Authorization.replace(
        "Credential=/",
        `Credential=${this._accessKey}`
      );
    });

    const object = await req.promise();

    return JSON.parse(object.Body as string) as ModuleRegistryResolver;
  }
}
