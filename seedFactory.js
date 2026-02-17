import fs from 'fs';

// ATTRIBUTE POOLS
const ATTRIBUTES = {
  STORAGE: ["128GB", "256GB", "512GB", "1TB"],
  CONDITION: ["new", "used", "refurbished"],
};

// PRODUCT MAP (Brand + Type logic)
const PRODUCT_MAP = [
  // Tech
  { brand: "Apple", model: "iPhone 15 Pro", type: "mobile" },
  { brand: "Sony", model: "Alpha a7", type: "camera" },
  { brand: "Sony", model: "WH-1000XM5", type: "audio" },
  { brand: "Nvidia", model: "RTX 4090", type: "gpu" },
  { brand: "Apple", model: "MacBook Pro M3", type: "laptop" },
  { brand: "Bose", model: "QuietComfort Ultra", type: "audio" },
  { brand: "Samsung", model: "Galaxy S24 Ultra", type: "mobile" },
  { brand: "Dell", model: "XPS 13", type: "laptop" },
  { brand: "Microsoft", model: "Xbox Series X", type: "console" },
  { brand: "Sony", model: "PlayStation 5", type: "console" },

  // Automotive
  { brand: "Tesla", model: "Model 3", type: "car" },
  { brand: "Toyota", model: "Corolla", type: "car" },
  { brand: "Ford", model: "F-150", type: "truck" },
  { brand: "BMW", model: "R 1250 GS", type: "motorcycle" },

  // Fashion
  { brand: "Nike", model: "Air Force 1", type: "shoes" },
  { brand: "Adidas", model: "Ultraboost 22", type: "shoes" },
  { brand: "Rolex", model: "Submariner", type: "watch" },
  { brand: "Louis Vuitton", model: "Neverfull MM", type: "bag" },

  // Home Appliances
  { brand: "Dyson", model: "V15 Detect", type: "vacuum" },
  { brand: "KitchenAid", model: "Artisan Stand Mixer", type: "kitchen_appliance" },
  { brand: "LG", model: "InstaView Door-in-Door", type: "refrigerator" },
  { brand: "Philips", model: "Airfryer XXL", type: "kitchen_appliance" },

  // Furniture
  { brand: "IKEA", model: "MALM Bed Frame", type: "furniture" },
  { brand: "Herman Miller", model: "Aeron Chair", type: "furniture" },

  // Sports & Outdoors
  { brand: "Peloton", model: "Bike+", type: "fitness_equipment" },
  { brand: "Wilson", model: "Pro Staff RF97", type: "sports_equipment" },
  { brand: "Yeti", model: "Tundra 45", type: "outdoor_gear" },

  // Beauty & Personal Care
  { brand: "Chanel", model: "No. 5", type: "fragrance" },
  { brand: "Oral-B", model: "iO Series 9", type: "personal_care" },

  // Food & Beverage
  { brand: "Nespresso", model: "Vertuo Next", type: "coffee_machine" },
  { brand: "Coca-Cola", model: "Classic", type: "beverage" },

  // Toys & Hobbies
  { brand: "LEGO", model: "Millennium Falcon 75192", type: "toy" },
  { brand: "DJI", model: "Mavic 3 Pro", type: "drone" }
];


function generateMassiveList(shardId = 0, shardTotal = 1) {
  const allSeeds = [];

  for (const item of PRODUCT_MAP) {
    // Only give storage loops to PHONES and LAPTOPS
    const storagePool = (item.type === "mobile" || item.type === "laptop") 
      ? ATTRIBUTES.STORAGE 
      : [""]; 

      for (const storage of storagePool) {
        for (const condition of ATTRIBUTES.CONDITION) {
            const seed = `${item.brand} ${item.model} ${storage} ${condition}`.replace(/\s+/g, ' ').trim();
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
