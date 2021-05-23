import AWS from "aws-sdk";

import { checkIfExist } from "../../../utils/util";

import {
  IModuleRegistryResolver,
  ModuleRegistryResolver,
  REGISTRY_NAME,
} from "./index";

export class RemoteBucketStorage implements IModuleRegistryResolver {
  private s3: AWS.S3;
  private readonly bucketName: string;
  private readonly accessKey: string;
  private readonly version: string;
  private registryFile: ModuleRegistryResolver;

  constructor(
    endpoint: string,
    region: string,
    bucketName: string,
    accessKey: string = "",
    secretAccessKey: string = "",
    version: string = "v0.0.1"
  ) {
    this.bucketName = bucketName;
    this.accessKey = accessKey;
    this.version = version;
    this.registryFile = {};

    this.s3 = new AWS.S3({
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
      if (!checkIfExist(this.registryFile[this.version])) {
        this.registryFile = await this.getRemoteRegistry(moduleName, networkId);
      }

      return this.registryFile[this.version][bindingName];
    } catch (err) {
      if (err.statusCode == 404) {
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
    if (contractAddress == "") {
      return true;
    }

    try {
      if (!checkIfExist(this.registryFile)) {
        this.registryFile = await this.getRemoteRegistry(moduleName, networkId);
      }
    } catch (err) {
      if (err?.statusCode != 404) {
        throw err;
      }
    }
    if (!checkIfExist(this.registryFile[this.version])) {
      this.registryFile[this.version] = {};
    }
    this.registryFile[this.version][bindingName] = contractAddress;

    const params: AWS.S3.Types.PutObjectRequest = {
      Bucket: this.bucketName,
      Key: `${moduleName}_${networkId}_${REGISTRY_NAME}`,
      Body: JSON.stringify(this.registryFile, undefined, 4),
    };

    await this.s3.upload(params).promise();

    return true;
  }

  private async getRemoteRegistry(
    moduleName: string,
    networkId: string
  ): Promise<ModuleRegistryResolver> {
    const req = this.s3.getObject({
      Bucket: this.bucketName,
      Key: `${moduleName}_${networkId}_${REGISTRY_NAME}`,
    });

    req.on("sign", () => {
      if (!req.httpRequest.headers.Authorization && this.accessKey) {
        req.httpRequest.headers.Authorization = `Credential=${this.accessKey}`;

        return;
      }

      if (this.accessKey == "") {
        delete req.httpRequest.headers.Authorization;
        req.httpRequest.headers["public-read"] = "public-read";

        return;
      }

      req.httpRequest.headers.Authorization = req.httpRequest.headers.Authorization.replace(
        "Credential=/",
        `Credential=${this.accessKey}`
      );
    });

    const object = await req.promise();

    return JSON.parse(object.Body as string) as ModuleRegistryResolver;
  }
}
