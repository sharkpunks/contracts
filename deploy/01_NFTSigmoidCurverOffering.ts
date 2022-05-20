const TOKEN = "0xa59a5b0c946086d6884455a6a556729d747d16d3";
const DISCOUNT_TOKEN = "0xb8b07d0f2990ddd5b99b6db59dd8356ca2b1302d";

export default async ({ getNamedAccounts, deployments }) => {
    const { deploy, get } = deployments;
    const { deployer } = await getNamedAccounts();

    const vault = await get("ETHVault");

    await deploy("NFTSigmoidCurveOffering", {
        from: deployer,
        args: [TOKEN, vault.address, DISCOUNT_TOKEN],
        log: true,
    });
};
