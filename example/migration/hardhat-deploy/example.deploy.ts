module.exports = async ({
                          getNamedAccounts,
                          deployments,
                          getChainId,
                          getUnnamedAccounts,
                        }) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy('Migrations', {
    from: deployer,
    gasLimit: 4000000,
    args: [],
  });

  await deploy('TestToken', {
    from: deployer,
    gasLimit: 4000000,
    args: [],
  });
};
