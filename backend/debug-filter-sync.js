import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debugFilterSync() {
  console.log("🔍 Debugging Filter Sync...");

  try {
    // 1. Check if we have products with specs
    console.log("\n1. Checking products with specs...");
    const products = await prisma.product.findMany({
      take: 3,
      select: {
        id: true,
        name: true,
        specs: true,
        specs_detail: true,
        category_id: true,
      },
    });

    console.log(`Found ${products.length} products`);

    products.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}:`);
      console.log("   specs:", JSON.stringify(product.specs, null, 2));
      console.log(
        "   specs_detail:",
        JSON.stringify(product.specs_detail, null, 2)
      );
    });

    // 2. Test the processSpec logic manually
    console.log("\n2. Testing processSpec logic...");

    const filterMap = new Map();

    function processSpec(spec, categoryId, filterMap) {
      console.log(`   Processing spec:`, spec);

      const label = (spec.label || "").toLowerCase();
      const value = String(spec.value || "").trim();

      console.log(`   Label: "${label}", Value: "${value}"`);

      if (!value) {
        console.log("   ❌ Empty value, skipping");
        return;
      }

      let key = "";
      let displayLabel = "";

      if (label.includes("brand") && !label.includes("gpu")) {
        key = "brand";
        displayLabel = "Brand";
      } else if (label.includes("ram")) {
        key = "ram";
        displayLabel = "RAM";
      } else if (label.includes("screen") || label.includes("display")) {
        key = "screen_size";
        displayLabel = "Screen Size";
      } else if (label.includes("processor") || label.includes("cpu")) {
        key = "processor";
        displayLabel = "Processor";
      } else if (label.includes("chip")) {
        key = "chip";
        displayLabel = "Chip";
      } else if (label.includes("gpu") || label.includes("graphics")) {
        key = "gpu_brand";
        displayLabel = "GPU Brand";
      } else if (
        label.includes("drive") ||
        label.includes("storage") ||
        label.includes("ssd")
      ) {
        key = "drive_size";
        displayLabel = "Drive Size";
      } else if (label.includes("camera")) {
        key = "camera";
        displayLabel = "Camera";
      } else if (label.includes("battery")) {
        key = "battery";
        displayLabel = "Battery";
      } else if (label.includes("os") || label.includes("operating")) {
        key = "operating_system";
        displayLabel = "Operating System";
      }

      console.log(
        `   Mapped to key: "${key}", displayLabel: "${displayLabel}"`
      );

      if (key) {
        const mapKey = `${key}_${value}_${categoryId || "null"}`;
        if (!filterMap.has(mapKey)) {
          filterMap.set(mapKey, {
            key,
            label: displayLabel,
            value,
            category_id: categoryId ? BigInt(categoryId) : null,
          });
          console.log(`   ✅ Added to filterMap: ${mapKey}`);
        } else {
          console.log(`   ⚠️ Already exists in filterMap: ${mapKey}`);
        }
      } else {
        console.log(`   ❌ No key mapping found for label: "${label}"`);
      }
    }

    // Process first product manually
    if (products.length > 0) {
      const product = products[0];
      console.log(`\nProcessing product: ${product.name}`);

      // Process specs
      const specs = Array.isArray(product.specs) ? product.specs : [];
      console.log(`\nProcessing ${specs.length} specs:`);
      specs.forEach((spec, index) => {
        console.log(`\n--- Spec ${index + 1} ---`);
        processSpec(spec, product.category_id, filterMap);
      });

      // Process specs_detail
      const specsDetail = Array.isArray(product.specs_detail)
        ? product.specs_detail
        : [];
      console.log(
        `\nProcessing ${specsDetail.length} specs_detail categories:`
      );

      specsDetail.forEach((category, catIndex) => {
        console.log(
          `\n--- Category ${catIndex + 1}: ${
            category.category || "Unknown"
          } ---`
        );
        const items = Array.isArray(category.items) ? category.items : [];
        console.log(`Processing ${items.length} items in this category:`);

        items.forEach((item, itemIndex) => {
          console.log(`\n  --- Item ${itemIndex + 1} ---`);
          processSpec(item, product.category_id, filterMap);
        });
      });
    }

    // 3. Show final filterMap
    console.log(`\n3. Final filterMap (${filterMap.size} entries):`);
    filterMap.forEach((value, key) => {
      console.log(`   ${key}: ${JSON.stringify(value)}`);
    });

    // 4. Check existing filter keys in database
    console.log("\n4. Existing filter keys in database:");
    const existingKeys = await prisma.filterKey.findMany({
      select: { key: true, label: true },
    });

    existingKeys.forEach((key) => {
      console.log(`   ${key.key}: ${key.label}`);
    });
  } catch (error) {
    console.error("❌ Debug failed:", error);
  }
}

debugFilterSync()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
