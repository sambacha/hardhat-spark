import { buildModule, ModuleBuilder, expectFuncRead, sendAfterDeploy } from 'ignition-core';
import { ethers } from 'ethers';

export const SomeModule = buildModule('SomeModule', async (m: ModuleBuilder, wallets: ethers.Signer[]) => {
  m.library('Address');
  m.contractTemplate('TransparentUpgradeableProxy');
  m.contractTemplate('ERC20');

  const ERC20 = m.bindTemplate('ERC20One', 'ERC20', 'ExampleToken', 'EXMPL');
  const ERC20Two = m.bindTemplate('ERC20Two', 'ERC20', 'ExampleTokenTwo', 'EXMPLTWO');
  const Proxy = m.bindTemplate('Proxy', 'TransparentUpgradeableProxy', ERC20, await wallets[0].getAddress(), []);

  ERC20.afterDeploy(m, 'afterDeployMintTokens', async () => {
    const totalSupply = ethers.BigNumber.from(10).pow(18);
    await ERC20.deployed().mint(await wallets[0].getAddress(), totalSupply);

    await expectFuncRead(totalSupply.toString(), ERC20.deployed().totalSupply);
  });

  const mutatorEvent = sendAfterDeploy(
    m,
    Proxy,
    'upgradeTo',
    [ERC20Two], {
      eventName: 'changeFromToSecondToken',
      slot: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc' // bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1)
    }
  );

  m.group(ERC20Two, mutatorEvent).afterDeploy(m, 'afterDeployAndChange', async () => {
    const totalSupply = ethers.BigNumber.from(10).pow(17);
    await ERC20Two.deployed().mint(await wallets[0].getAddress(), totalSupply);

    await expectFuncRead(totalSupply.toString(), ERC20Two.deployed().totalSupply);
  });
});
