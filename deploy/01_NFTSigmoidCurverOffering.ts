const MINTER = "0xb79fa5c237D27dA6b062F9180717CD6169ba0c65";
const TOKEN = "0xa59a5b0c946086d6884455a6a556729d747d16d3";
const DISCOUNT_TOKEN = "0xb8b07d0f2990ddd5b99b6db59dd8356ca2b1302d";

export default async ({ getNamedAccounts, deployments }) => {
    const { deploy, get, execute } = deployments;
    const { deployer } = await getNamedAccounts();

    const vault = await get("ETHVault");

    const { address } = await deploy("NFTSigmoidCurveOffering", {
        from: deployer,
        args: [vault.address, MINTER, TOKEN, DISCOUNT_TOKEN],
        log: true,
    });
    await execute("ETHVault", { from: deployer, log: true }, "setOperator", address, true);
};
