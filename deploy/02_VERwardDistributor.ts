const VE = "0x77D3d884FeA1E389150a26D4569b20ebA284A86d";

export default async ({ getNamedAccounts, deployments }) => {
    const { deploy, get, execute } = deployments;
    const { deployer } = await getNamedAccounts();

    const vault = await get("ETHVault");

    const { address } = await deploy("VERewardDistributor", {
        from: deployer,
        args: [vault.address, VE],
        log: true,
    });
    await execute("ETHVault", { from: deployer, log: true }, "setOperator", address, true);
};
