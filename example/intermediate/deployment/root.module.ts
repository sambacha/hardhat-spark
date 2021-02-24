import { buildModule, ModuleBuilder, expectFuncRead, mutator } from '../../../src';
import { ethers } from 'ethers';

export const Module = buildModule('Module', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  m.library('Address');
  m.prototype('TransparentUpgradeableProxy');
  m.prototype('ERC20');

  const ERC20 = m.bindPrototype('ERC20One', 'ERC20', 'ExampleToken', 'EXMPL');
  const ERC20Two = m.bindPrototype('ERC20Two', 'ERC20', 'ExampleTokenTwo', 'EXMPLTWO');
  const Proxy = m.bindPrototype('Proxy', 'TransparentUpgradeableProxy', ERC20, wallets[0].address, []);

  ERC20.afterDeploy(m, 'afterDeployMintTokens', async () => {
    const totalSupply = ethers.BigNumber.from(10).pow(18);
    await ERC20.instance().mint(wallets[0].address, totalSupply);

    await expectFuncRead(totalSupply.toString(), ERC20.instance().totalSupply);
  });

  const mutatorEvent = mutator(
    m,
    Proxy,
    'upgradeTo',
    [ERC20Two], {
      name: 'changeFromToSecondToken',
      slot: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc' // bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1)
    }
  );

  m.group(ERC20Two, mutatorEvent).afterDeploy(m, 'afterDeployAndChange', async () => {
    const totalSupply = ethers.BigNumber.from(10).pow(17);
    await ERC20Two.instance().mint(wallets[1].address, totalSupply);

    await expectFuncRead(totalSupply.toString(), ERC20Two.instance().totalSupply);
  });
});
