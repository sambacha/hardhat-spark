import 'hardhat/types/config';
import 'hardhat/types/runtime';

import { HardhatMortarConfig } from '../../usage_interfaces/hardhat_plugin';
import { IMortar } from '../../usage_interfaces';

declare module 'hardhat/types/runtime' {
  export interface HardhatRuntimeEnvironment {
    mortar: IMortar;
  }
}

declare module 'hardhat/types/config' {
  export interface HardhatUserConfig {
    mortar?: HardhatMortarConfig;

  }

  export interface HardhatConfig {
    mortar: HardhatMortarConfig;
  }
}
