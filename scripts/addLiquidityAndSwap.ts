// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getNamedAccounts, deployments } from "hardhat";
import { Fetcher, Token, WETH } from "@sushiswap/sdk";
import readline from "readline-sync";
import { BigNumber, utils } from "ethers";

const deduct = (bn: BigNumber, percentage: number) => {
    return bn.mul(100 - percentage).div(100);
};

async function main() {
    const { deployer } = await getNamedAccounts();
    const { execute } = deployments;

    const amount = utils.parseEther(readline.question("Amount to withdraw: "));
    const amountETHInSwap = utils.parseEther(readline.question("Amount to swap: "));
    if (amountETHInSwap.gt(amount.div(2))) throw new Error("Amount to swap too large");

    const weth = WETH[1];
    const token = new Token(1, "0xf474E526ADe9aD2CC2B66ffCE528B1A51B91FCdC", 18);
    const pair = await Fetcher.fetchPairData(weth, token);

    const amountETH = amount.div(2);
    const reserveToken = BigNumber.from(pair.reserveOf(token).raw.toString());
    const reserveETH = BigNumber.from(pair.reserveOf(weth).raw.toString());
    const amountToken = amountETH.mul(reserveToken).div(reserveETH);

    const reserveTokenSwap = reserveToken.add(amountToken);
    const reserveETHSwap = reserveETH.add(amountETH);
    const amountETHInWithFee = amountETHInSwap.mul(997);
    const amountTokenOutSwap = amountETHInWithFee
        .mul(reserveTokenSwap)
        .div(reserveETHSwap.mul(1000).add(amountETHInWithFee));

    console.log(
        [
            amount,
            amountToken,
            deduct(amountToken, 1),
            deduct(amountETH, 1),
            amountETHInSwap,
            deduct(amountTokenOutSwap, 1),
        ].map(v => v.toString())
    );

    await execute(
        "LiquidityProvider",
        { from: deployer },
        "addLiquidityAndSwap",
        amount,
        amountToken,
        deduct(amountToken, 1),
        deduct(amountETH, 1),
        amountETHInSwap,
        deduct(amountTokenOutSwap, 1)
    );
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
