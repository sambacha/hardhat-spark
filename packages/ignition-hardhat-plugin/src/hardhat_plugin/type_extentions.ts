import 'hardhat/types/config';
import 'hardhat/types/runtime';
import { HardhatIgnitionConfig, IHardhatIgnition } from '../index';

declare module 'hardhat/types/runtime' {
  export interface HardhatRuntimeEnvironment {
    ignition: IHardhatIgnition;
  }
}

declare module 'hardhat/types/config' {
  export interface HardhatUserConfig {
    ignition?: HardhatIgnitionConfig;
  }

  export interface HardhatConfig {
    ignition?: HardhatIgnitionConfig;
  }
}
