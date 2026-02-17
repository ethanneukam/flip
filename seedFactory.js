import fs from 'fs';

// ATTRIBUTE POOLS
const ATTRIBUTES = {
  STORAGE: ["128GB", "256GB", "512GB", "1TB"],
  CONDITION: ["new", "used", "refurbished"],
  REGIONS: ["US", "UK", "CA"],
  YEARS: [2025, 2024, 2023]
};

// PRODUCT MAP (Brand + Type logic)
const PRODUCT_MAP = [
  { brand: "Apple", model: "iPhone 15 Pro", type: "mobile" },
  { brand: "Sony", model: "Alpha a7", type: "camera" },
  { brand: "Sony", model: "WH-1000XM5", type: "audio" },
  { brand: "Nvidia", model: "RTX 4090", type: "gpu" },
  { brand: "Apple", model: "MacBook Pro M3", type: "laptop" },
  { brand: "Bose", model: "QuietComfort Ultra", type: "audio" },
  { brand: "Samsung", model: "Galaxy S24 Ultra", type: "mobile" }
];

function generateMassiveList(shardId = 0, shardTotal = 1) {
  const allSeeds = [];

  for (const item of PRODUCT_MAP) {
    // Only give storage loops to PHONES and LAPTOPS
    const storagePool = (item.type === "mobile" || item.type === "laptop") 
      ? ATTRIBUTES.STORAGE 
      : [""]; 

    for (const year of ATTRIBUTES.YEARS) {
      for (const storage of storagePool) {
        for (const condition of ATTRIBUTES.CONDITION) {
          for (const region of ATTRIBUTES.REGIONS) {
            const seed = `${item.brand} ${item.model} ${year} ${storage} ${condition} ${region}`.replace(/\s+/g, ' ').trim();
            allSeeds.push(seed);
          }
        }
      }
    }
  }

  // Fisher-Yates Shuffle
  for (let i = allSeeds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allSeeds[i], allSeeds[j]] = [allSeeds[j], allSeeds[i]];
  }

  const stream = fs.createWriteStream(`./seeds-${shardId}.txt`);
  let count = 0;
  
  allSeeds.forEach((seed, index) => {
    if (index % shardTotal === shardId) {
      stream.write(seed + '\n');
      count++;
    }
  });

  stream.end();
  console.log(`✅ Factory: Generated ${count} seeds for Shard ${shardId}`);
}

// Get arguments from command line (node seedFactory.js 0 1)
const args = process.argv.slice(2);
const shardId = parseInt(args[0] || "0");
const shardTotal = parseInt(args[1] || "1");

generateMassiveList(shardId, shardTotal);
generateMassiveList(shardId, shardTotal);
