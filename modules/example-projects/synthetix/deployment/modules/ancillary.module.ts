import { buildModule } from "ignition-core";

import { SynthetixModuleBuilder } from "../SynthetixModule";

export const SynthetixAncillary = buildModule(
  "SynthetixAncillary",
  async (m: SynthetixModuleBuilder) => {
    const ReadProxyAddressResolver = m.ReadProxyAddressResolver;
    m.contract("Depot", m.ETH_ADDRESS, m.ETH_ADDRESS, ReadProxyAddressResolver);

    if (m.useOvm) {
      m.bindTemplate("EtherCollateral", "EmptyEtherCollateral");
      m.bindTemplate("EtherCollateralsUSD", "EmptyEtherCollateral");
      m.contract(
        "SynthetixBridgeToBase",
        m.ETH_ADDRESS,
        ReadProxyAddressResolver
      );
    } else {
      m.contract("EtherCollateral", m.ETH_ADDRESS, ReadProxyAddressResolver);
      m.contract(
        "EtherCollateralsUSD",
        m.ETH_ADDRESS,
        ReadProxyAddressResolver
      );
      m.contract(
        "SynthetixBridgeToOptimism",
        m.ETH_ADDRESS,
        ReadProxyAddressResolver
      );
    }

    m.contract(
      "BinaryOptionMarketFactory",
      m.ETH_ADDRESS,
      ReadProxyAddressResolver
    );
  }
);
