import fs from 'fs';

// 1. Define specific attribute pools
const ATTRIBUTES = {
  STORAGE: ["128GB", "256GB", "512GB", "1TB"],
  CONDITION: ["new", "used", "refurbished"],
  REGIONS: ["US", "UK", "CA"],
  MARKET: ["price", "resale value", "for sale"],
  YEARS: [2025, 2024, 2023]
};

// 2. Define the Products and their "Trait Categories"
// This tells the script: "Only give storage loops to PHONES and LAPTOPS"
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
  const allSeeds: string[] = []; // Temporary array for shuffling

  for (const item of PRODUCT_MAP) {
    const storagePool = (item.type === "mobile" || item.type === "laptop") 
      ? ATTRIBUTES.STORAGE 
      : [""];

    for (const year of ATTRIBUTES.YEARS) {
      for (const storage of storagePool) {
        for (const condition of ATTRIBUTES.CONDITION) {
          for (const region of ATTRIBUTES.REGIONS) {
            for (const market of ATTRIBUTES.MARKET) {
              const seed = `${item.brand} ${item.model} ${year} ${storage} ${condition} ${region} ${market}`.replace(/\s+/g, ' ').trim();
              allSeeds.push(seed);
            }
          }
        }
      }
    }
  }

  // Fisher-Yates Shuffle Algorithm
  for (let i = allSeeds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allSeeds[i], allSeeds[j]] = [allSeeds[j], allSeeds[i]];
  }

  // Filter for sharding and write to file
  const stream = fs.createWriteStream(`./seeds-${shardId}.txt`);
  let count = 0;
  allSeeds.forEach((seed, index) => {
    if (index % shardTotal === shardId) {
      stream.write(seed + '\n');
      count++;
    }
  });

  stream.end();
  console.log(`✅ Shard ${shardId}: Produced ${count.toLocaleString()} shuffled seeds.`);
}

const shardId = parseInt(process.argv[2] || "0");
const shardTotal = parseInt(process.argv[3] || "1");

generateMassiveList(shardId, shardTotal);
