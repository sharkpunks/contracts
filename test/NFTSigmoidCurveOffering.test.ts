import { ethers } from "hardhat";
import { expect } from "chai";
import { NFT, NFTSigmoidCurveOffering, ETHVault } from "../typechain";

const { provider, constants, BigNumber } = ethers;

const TOKEN_ID_MIN = 1083;
const TOKEN_ID_MAX = 6900;
const INITIAL_PRICE = BigNumber.from(333).mul(BigNumber.from(10).pow(14));
const INFLATION_RATE = 1002496;
const INFLATION_BASE = 1000000;
const INFLECTION_POINT = 3992;
const FINAL_PRICE = BigNumber.from("93716465580792648570");

const setupTest = async () => {
    const signers = await ethers.getSigners();
    const [deployer, alice, bob, carol] = signers;

    const NFTContract = await ethers.getContractFactory("NFT");
    const token = (await NFTContract.deploy("Sharkpunks", "NOM")) as NFT;
    const discount = (await NFTContract.deploy("Stupid Mortys", "MORTY")) as NFT;
    await discount.mintBatch(deployer.address, [0, 1, 2], "0x");

    const VaultContract = await ethers.getContractFactory("ETHVault");
    const vault = (await VaultContract.deploy()) as ETHVault;

    const SCOContract = await ethers.getContractFactory("NFTSigmoidCurveOffering");
    const sco = (await SCOContract.deploy(token.address, vault.address, discount.address)) as NFTSigmoidCurveOffering;
    await token.transferOwnership(sco.address);
    await vault.setOperator(sco.address, true);

    return {
        deployer,
        vault,
        alice,
        bob,
        carol,
        token,
        discount,
        sco,
    };
};

describe("NFTSigmoidCurveOffering", function () {
    it("should mint() and burn()", async function () {
        const { sco, token, vault, alice } = await setupTest();

        expect(await token.balanceOf(alice.address)).eq(0);
        expect(await provider.getBalance(vault.address)).eq(constants.Zero);

        let [price, totalPrice] = [INITIAL_PRICE, constants.Zero];
        const priceOf = { [TOKEN_ID_MIN]: INITIAL_PRICE };
        let count = 0;
        let tokenId = TOKEN_ID_MIN;
        while (tokenId < INFLECTION_POINT) {
            const tx = await sco.connect(alice).mint(alice.address, { value: price });
            const { events } = await tx.wait();
            totalPrice = totalPrice.add(price);
            count++;

            const event = events.find(e => e.address === sco.address && e.event === "Mint");
            expect(event.args.price).eq(price);
            expect(await token.ownerOf(tokenId)).eq(alice.address);
            expect(await token.balanceOf(alice.address)).eq(count);
            expect(await provider.getBalance(vault.address)).eq(totalPrice);
            price = price.mul(INFLATION_RATE).div(INFLATION_BASE);
            priceOf[tokenId + 1] = price;
            tokenId++;
        }
        while (tokenId < TOKEN_ID_MAX) {
            const c = INFLECTION_POINT * 2 - 2 - tokenId;
            price = FINAL_PRICE.sub(priceOf[c]);
            const tx = await sco.connect(alice).mint(alice.address, { value: price });
            const { events } = await tx.wait();
            totalPrice = totalPrice.add(price);
            count++;

            const event = events.find(e => e.address === sco.address && e.event === "Mint");
            expect(event.args.price).eq(price);
            expect(await token.ownerOf(tokenId)).eq(alice.address);
            expect(await token.balanceOf(alice.address)).eq(count);
            expect(await provider.getBalance(vault.address)).eq(totalPrice);
            if (tokenId > INFLECTION_POINT) {
                priceOf[tokenId] = price;
            }
            tokenId++;
        }

        for (let tokenId = TOKEN_ID_MIN; tokenId < TOKEN_ID_MAX; tokenId++) {
            await token.connect(alice).approve(sco.address, tokenId);
            const tx = await sco.connect(alice).burn(tokenId, 0, constants.HashZero);
            const { events } = await tx.wait();
            count -= 1;

            const event = events.find(e => e.address === sco.address && e.event === "Burn");
            const amount = priceOf[tokenId].div(3);
            totalPrice = totalPrice.sub(amount);
            expect(event.args.amount).eq(amount);
            expect(token.ownerOf(tokenId)).to.be.reverted;
            expect(await token.balanceOf(alice.address)).eq(count);
            expect(await provider.getBalance(vault.address)).eq(totalPrice);
        }
    });

    it("should mint() with discount", async function () {
        const { sco, deployer, alice, discount } = await setupTest();

        await discount.connect(deployer).transferFrom(deployer.address, alice.address, 0);

        const price = INITIAL_PRICE;
        const tx = await sco.connect(alice).mintDiscounted(alice.address, { value: price });
        const { events } = await tx.wait();

        const event = events.find(e => e.address === sco.address && e.event === "Mint");
        expect(event.args.price).eq(price.sub(price.div(10)));
    });

    it("should mintBatch() one by one", async function () {
        const { sco, token, vault, alice } = await setupTest();

        expect(await token.balanceOf(alice.address)).eq(0);
        expect(await provider.getBalance(vault.address)).eq(constants.Zero);

        let [price, totalPrice] = [INITIAL_PRICE, constants.Zero];
        const priceOf = { [TOKEN_ID_MIN]: INITIAL_PRICE };
        let count = 0;
        let tokenId = TOKEN_ID_MIN;
        while (tokenId < INFLECTION_POINT) {
            const tx = await sco.connect(alice).mintBatch(alice.address, 1, { value: price });
            const { events } = await tx.wait();
            totalPrice = totalPrice.add(price);
            count++;

            const event = events.find(e => e.address === sco.address && e.event === "Mint");
            expect(event.args.price).eq(price);
            expect(await token.ownerOf(tokenId)).eq(alice.address);
            expect(await token.balanceOf(alice.address)).eq(count);
            expect(await provider.getBalance(vault.address)).eq(totalPrice);
            price = price.mul(INFLATION_RATE).div(INFLATION_BASE);
            priceOf[tokenId + 1] = price;
            tokenId++;
        }
        while (tokenId < TOKEN_ID_MAX) {
            const c = INFLECTION_POINT * 2 - 2 - tokenId;
            price = FINAL_PRICE.sub(priceOf[c]);
            const tx = await sco.connect(alice).mintBatch(alice.address, 1, { value: price });
            const { events } = await tx.wait();
            totalPrice = totalPrice.add(price);
            count++;

            const event = events.find(e => e.address === sco.address && e.event === "Mint");
            expect(event.args.price).eq(price);
            expect(await token.ownerOf(tokenId)).eq(alice.address);
            expect(await token.balanceOf(alice.address)).eq(count);
            expect(await provider.getBalance(vault.address)).eq(totalPrice);
            if (tokenId > INFLECTION_POINT) {
                priceOf[tokenId + 1] = price;
            }
            tokenId++;
        }
    });

    it("should mintBatch() 10 by 10", async function () {
        const { sco, token, vault, alice } = await setupTest();

        expect(await token.balanceOf(alice.address)).eq(0);
        expect(await provider.getBalance(vault.address)).eq(constants.Zero);

        let length = 10;
        let totalPrice = constants.Zero;
        let count = 0;
        while (TOKEN_ID_MIN + count < TOKEN_ID_MAX) {
            if (TOKEN_ID_MIN + count + length >= TOKEN_ID_MAX) {
                length = TOKEN_ID_MAX - TOKEN_ID_MIN - count - 1;
            }
            if (length == 0) {
                break;
            }
            const tx = await sco
                .connect(alice)
                .mintBatch(alice.address, length, { value: constants.WeiPerEther.mul(10000) });
            let { events } = await tx.wait();
            events = events.filter(event => event.address == sco.address && event.event == "Mint");
            totalPrice = events.reduce((prev, current) => prev.add(current.args.price), totalPrice);
            count += length;

            expect(await token.balanceOf(alice.address)).eq(count);
            expect(await provider.getBalance(vault.address)).eq(totalPrice);
        }
    });

    it("should mintBatch() with discount", async function () {
        const { sco, deployer, alice, discount } = await setupTest();

        await discount.connect(deployer).transferFrom(deployer.address, alice.address, 0);

        const tx = await sco
            .connect(alice)
            .mintBatchDiscounted(alice.address, 10, { value: constants.WeiPerEther.mul(10000) });
        const { events } = await tx.wait();

        let price = INITIAL_PRICE;
        for (let tokenId = TOKEN_ID_MIN; tokenId < TOKEN_ID_MIN + 10; tokenId++) {
            const event = events.find(
                e => e.address === sco.address && e.event === "Mint" && e.args.tokenId.eq(tokenId)
            );
            expect(event.args.price).eq(price.sub(price.div(10)));

            price = price.mul(INFLATION_RATE).div(INFLATION_BASE);
        }
    });
});
