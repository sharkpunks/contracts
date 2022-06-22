import { constants } from "ethers";

const TOKEN = "0xf474E526ADe9aD2CC2B66ffCE528B1A51B91FCdC";
const TREASURY = "0x0903f8892c06A99bf1D68088fAB597a0762e0BC8";
const FACTORY = "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

export default async ({ getNamedAccounts, deployments }) => {
    const { deploy, get, execute } = deployments;
    const { deployer } = await getNamedAccounts();

    const vault = await get("ETHVault");

    const { address } = await deploy("LiquidityProvider", {
        from: deployer,
        args: [vault.address, TOKEN, TREASURY, FACTORY, WETH, constants.WeiPerEther.div(2)],
        log: true,
    });
    await execute("ETHVault", { from: deployer, log: true }, "setOperator", address, true);
};
