export default async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy("ETHVault", {
        from: deployer,
        args: [],
        log: true,
    });
};
