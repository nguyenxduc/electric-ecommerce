import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testFilterLogic() {
  console.log("🧪 Testing Filter Logic...");

  try {
    // Test 1: Single brand filter
    console.log("\n1. Testing single brand filter (apple):");
    const response1 = await fetch(
      "http://localhost:5000/api/products?brand=apple"
    );
    const data1 = await response1.json();
    console.log(`   Found ${data1.data?.length || 0} products`);

    // Test 2: Multiple brand filter (OR logic)
    console.log("\n2. Testing multiple brand filter (apple,samsung):");
    const response2 = await fetch(
      "http://localhost:5000/api/products?brand=apple,samsung"
    );
    const data2 = await response2.json();
    console.log(`   Found ${data2.data?.length || 0} products`);

    // Test 3: Brand + RAM filter (AND logic between keys, OR within keys)
    console.log("\n3. Testing brand + RAM filter (apple,samsung + 8,16):");
    const response3 = await fetch(
      "http://localhost:5000/api/products?brand=apple,samsung&ram=8,16"
    );
    const data3 = await response3.json();
    console.log(`   Found ${data3.data?.length || 0} products`);

    // Test 4: Complex filter with price range
    console.log("\n4. Testing complex filter (brand + price_range):");
    const response4 = await fetch(
      "http://localhost:5000/api/products?brand=apple,samsung&price_range=500-1000,1000-2000"
    );
    const data4 = await response4.json();
    console.log(`   Found ${data4.data?.length || 0} products`);

    // Show sample products for verification
    if (data2.data && data2.data.length > 0) {
      console.log("\n📋 Sample products from multiple brand filter:");
      data2.data.slice(0, 3).forEach((product) => {
        console.log(`   - ${product.name} (${product.final_price})`);
      });
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Helper function to create test filter data
async function createTestFilterData() {
  console.log("🌱 Creating test filter data...");

  try {
    // Ensure we have filter keys
    const brandKey = await prisma.filterKey.upsert({
      where: { key: "brand" },
      update: {},
      create: {
        key: "brand",
        label: "Brand",
        data_type: "string",
        is_active: true,
        order: 1,
      },
    });

    const ramKey = await prisma.filterKey.upsert({
      where: { key: "ram" },
      update: {},
      create: {
        key: "ram",
        label: "RAM",
        data_type: "string",
        is_active: true,
        order: 2,
      },
    });

    // Create filter options
    const brandOptions = [
      { value: "apple", display_value: "Apple" },
      { value: "samsung", display_value: "Samsung" },
      { value: "dell", display_value: "Dell" },
    ];

    const ramOptions = [
      { value: "8", display_value: "8GB" },
      { value: "16", display_value: "16GB" },
      { value: "32", display_value: "32GB" },
    ];

    for (const option of brandOptions) {
      await prisma.filterOption.upsert({
        where: {
          filter_key_id_value_category_id: {
            filter_key_id: brandKey.id,
            value: option.value,
            category_id: null,
          },
        },
        update: { display_value: option.display_value },
        create: {
          filter_key_id: brandKey.id,
          value: option.value,
          display_value: option.display_value,
          is_active: true,
        },
      });
    }

    for (const option of ramOptions) {
      await prisma.filterOption.upsert({
        where: {
          filter_key_id_value_category_id: {
            filter_key_id: ramKey.id,
            value: option.value,
            category_id: null,
          },
        },
        update: { display_value: option.display_value },
        create: {
          filter_key_id: ramKey.id,
          value: option.value,
          display_value: option.display_value,
          is_active: true,
        },
      });
    }

    // Get some products and create filter values
    const products = await prisma.product.findMany({
      take: 5,
      select: { id: true, name: true },
    });

    if (products.length > 0) {
      // Assign brand values to products
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const brandValue = i < 2 ? "apple" : i < 4 ? "samsung" : "dell";
        const ramValue = i % 2 === 0 ? "8" : "16";

        // Create ProductFilterValue for brand
        await prisma.productFilterValue.upsert({
          where: {
            product_id_filter_key_id: {
              product_id: product.id,
              filter_key_id: brandKey.id,
            },
          },
          update: { raw_value: brandValue },
          create: {
            product_id: product.id,
            filter_key_id: brandKey.id,
            raw_value: brandValue,
          },
        });

        // Create ProductFilterValue for RAM
        await prisma.productFilterValue.upsert({
          where: {
            product_id_filter_key_id: {
              product_id: product.id,
              filter_key_id: ramKey.id,
            },
          },
          update: { raw_value: ramValue },
          create: {
            product_id: product.id,
            filter_key_id: ramKey.id,
            raw_value: ramValue,
          },
        });

        console.log(
          `   ✅ ${product.name}: brand=${brandValue}, ram=${ramValue}GB`
        );
      }
    }

    console.log("✅ Test filter data created successfully!");
  } catch (error) {
    console.error("❌ Failed to create test data:", error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--setup")) {
    await createTestFilterData();
  } else if (args.includes("--test")) {
    await testFilterLogic();
  } else {
    console.log("Usage:");
    console.log("  node test-filter-logic.js --setup   # Create test data");
    console.log("  node test-filter-logic.js --test    # Run filter tests");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
