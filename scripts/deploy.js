const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying ConfidentialWordGame...\n");

  const [deployer] = await ethers.getSigners();

  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // In production, relayer should be a separate secure address
  // For development, we use deployer as relayer
  const relayerAddress = deployer.address;

  console.log("\n📝 Contract Parameters:");
  console.log("- Relayer address:", relayerAddress);
  console.log("- Entry fee: 10 ETH");
  console.log("- Max players per room: 5");
  console.log("- Round time limit: 60 seconds");

  // Deploy the contract
  console.log("\n⏳ Deploying contract...");
  const ConfidentialWordGame = await ethers.getContractFactory("ConfidentialWordGame");
  const game = await ConfidentialWordGame.deploy(relayerAddress);

  await game.waitForDeployment();

  const gameAddress = await game.getAddress();

  console.log("\n✅ Contract deployed successfully!");
  console.log("📍 Contract address:", gameAddress);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: gameAddress,
    relayerAddress: relayerAddress,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  };

  console.log("\n📊 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Verify contract params
  console.log("\n🔍 Verifying contract parameters...");
  const maxPlayers = await game.MAX_PLAYERS_PER_ROOM();
  const entryFee = await game.ENTRY_FEE();
  const roundTimeLimit = await game.ROUND_TIME_LIMIT();
  const relayer = await game.relayer();

  console.log("✓ Max players per room:", maxPlayers.toString());
  console.log("✓ Entry fee:", ethers.formatEther(entryFee), "ETH");
  console.log("✓ Round time limit:", roundTimeLimit.toString(), "seconds");
  console.log("✓ Relayer:", relayer);

  // Write deployment info to file
  const fs = require("fs");
  const path = require("path");

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFilePath = path.join(
    deploymentsDir,
    `${hre.network.name}-deployment.json`
  );

  fs.writeFileSync(
    deploymentFilePath,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n💾 Deployment info saved to:", deploymentFilePath);

  // Export contract ABI for frontend
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "ConfidentialWordGame.sol",
    "ConfidentialWordGame.json"
  );

  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const abiPath = path.join(deploymentsDir, `${hre.network.name}-abi.json`);

    fs.writeFileSync(
      abiPath,
      JSON.stringify(artifact.abi, null, 2)
    );

    console.log("📄 ABI saved to:", abiPath);
  }

  console.log("\n✨ Deployment complete!\n");

  // Print next steps
  console.log("📋 Next Steps:");
  console.log("1. Set environment variable:");
  console.log(`   export GAME_CONTRACT_ADDRESS=${gameAddress}`);
  console.log("\n2. Run relayer service:");
  console.log("   node scripts/relayer.js");
  console.log("\n3. Test the deployment:");
  console.log("   npx hardhat test --network", hre.network.name);

  return gameAddress;
}

main()
  .then((address) => {
    console.log("\n🎉 Success! Contract at:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
