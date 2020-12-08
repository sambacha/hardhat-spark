import {IStateRegistryResolver, ModuleState, STATE_NAME} from "./index";
import AWS from 'aws-sdk';
import {ModuleStateRepo} from "../state_repo";

export class RemoteBucketStorage implements IStateRegistryResolver {
  private s3: AWS.S3
  private readonly bucketName: string
  private readonly accessKey: string

  constructor(endpoint: string, accessKey: string, secretAccessKey: string, region: string, bucketName: string) {
    this.bucketName = bucketName
    this.accessKey = accessKey

    this.s3 = new AWS.S3({
      region: region,
      credentials: new AWS.Credentials({
        accessKeyId: accessKey,
        secretAccessKey: secretAccessKey,
        sessionToken: "",
      }),
      endpoint: endpoint,
    });
  }


  async getModuleState(networkId: number, moduleName: string): Promise<ModuleState> {
    try {
      const req = this.s3.getObject({
        Bucket: this.bucketName,
        Key: `${moduleName}_${networkId}_${STATE_NAME}`,
      })

      req.on("sign", () => {
        req.httpRequest.headers["Authorization"] =
          req.httpRequest.headers["Authorization"]
            .replace("Credential=/", `Credential=${this.accessKey}`)
      })

      const object = await req.promise()

      return JSON.parse(object.Body as string) as ModuleState
    } catch (err) {
      if (err.statusCode == 404) {
        return {}
      }

      throw err
    }
  }

  async storeStates(networkId: number, moduleName: string, bindings: ModuleState | null): Promise<boolean> {
    if (bindings == null) {
      return true
    }

    const metaData = ModuleStateRepo.convertBindingsToMetaData(bindings)

    const params: AWS.S3.Types.PutObjectRequest = {
      Bucket: this.bucketName,
      Key: `${moduleName}_${networkId}_${STATE_NAME}`,
      Body: JSON.stringify(metaData, null, 4)
    }
    const resp = await this.s3.upload(params).promise()
    return true
  }

  checkIfSet(moduleName: string, networkId: number): boolean {
    return false;
  }
}
