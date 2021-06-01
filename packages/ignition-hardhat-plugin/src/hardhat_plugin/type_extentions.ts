import "hardhat/types/config";
import "hardhat/types/runtime";
import { GasPriceBackoff } from "ignition-core";

import { HardhatIgnitionConfig, IHardhatIgnition } from "../index";

declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    ignition: IHardhatIgnition;
  }
}

declare module "hardhat/types/config" {
  export interface HardhatUserConfig {
    ignition?: HardhatIgnitionConfig;
  }

  export interface HardhatConfig {
    ignition?: HardhatIgnitionConfig;
  }

  export interface HardhatNetworkConfig {
    parallelizeDeployment?: boolean;
    blockConfirmation?: number;
    localDeployment?: boolean;
    deploymentFilePath?: string;
    gasPriceBackoff?: GasPriceBackoff;
  }

  export interface HttpNetworkConfig {
    blockConfirmation?: number;
    localDeployment?: boolean;
    deploymentFilePath?: string;
    gasPriceBackoff?: GasPriceBackoff;
    parallelizeDeployment?: boolean;
  }

  export interface HardhatNetworkUserConfig {
    blockConfirmation?: number;
    localDeployment?: boolean;
    deploymentFilePath?: string;
    gasPriceBackoff?: GasPriceBackoff;
    parallelizeDeployment?: boolean;
  }

  export interface HttpNetworkUserConfig {
    blockConfirmation?: number;
    localDeployment?: boolean;
    deploymentFilePath?: string;
    gasPriceBackoff?: GasPriceBackoff;
    parallelizeDeployment?: boolean;
  }
}
