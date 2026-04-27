import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testSpecsSync() {
  console.log("🧪 Testing Specs & Specs Detail Sync...");

  try {
    // First, let's check what specs and specs_detail look like in our products
    const products = await prisma.product.findMany({
      take: 3,
      select: {
        id: true,
        name: true,
        specs: true,
        specs_detail: true,
      },
    });

    console.log("\n📋 Sample Product Specs:");
    products.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}:`);

      console.log("   specs:", JSON.stringify(product.specs, null, 2));
      console.log(
        "   specs_detail:",
        JSON.stringify(product.specs_detail, null, 2)
      );
    });

    // Test the sync function
    console.log("\n🔄 Testing sync filter options from products...");

    const response = await fetch(
      "http://localhost:5000/api/admin/filters/sync",
      {
        method: "POST",
      }
    );

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Sync result:", result);
    } else {
      console.log("❌ Sync failed:", response.status, response.statusText);
    }

    // Check what filter keys and options were created
    console.log("\n📊 Current Filter Keys:");
    const filterKeys = await prisma.filterKey.findMany({
      include: {
        filter_options: {
          take: 5,
          select: {
            value: true,
            display_value: true,
          },
        },
      },
    });

    filterKeys.forEach((key) => {
      console.log(`\n   ${key.label} (${key.key}):`);
      key.filter_options.forEach((option) => {
        console.log(`     - ${option.display_value || option.value}`);
      });
      if (key.filter_options.length === 5) {
        console.log("     - ... (showing first 5)");
      }
    });
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Helper function to create sample products with nested specs_detail
async function createSampleProductsWithSpecs() {
  console.log("🌱 Creating sample products with specs...");

  try {
    // Get or create a category
    let category = await prisma.category.findFirst();
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: "Test Category",
          slug: "test-category",
        },
      });
    }

    const sampleProducts = [
      {
        name: "iPhone 15 Pro Max Test",
        price: 1299.99,
        category_id: category.id,
        specs: [
          { label: "Brand", value: "Apple" },
          { label: "Screen", value: "6.7 inch" },
        ],
        specs_detail: [
          {
            category: "Display",
            items: [
              { label: "Screen Size", value: "6.7 inch" },
              { label: "Technology", value: "Super Retina XDR" },
              { label: "Resolution", value: "2796 x 1290" },
            ],
          },
          {
            category: "Performance",
            items: [
              { label: "Chip", value: "A17 Pro" },
              { label: "RAM", value: "8GB" },
              { label: "Storage", value: "256GB" },
            ],
          },
          {
            category: "Camera",
            items: [
              { label: "Main Camera", value: "48MP" },
              { label: "Ultra Wide", value: "12MP" },
              { label: "Telephoto", value: "12MP" },
            ],
          },
        ],
      },
      {
        name: "Samsung Galaxy S24 Ultra Test",
        price: 1199.99,
        category_id: category.id,
        specs: [
          { label: "Brand", value: "Samsung" },
          { label: "Screen", value: "6.8 inch" },
        ],
        specs_detail: [
          {
            category: "Display",
            items: [
              { label: "Screen Size", value: "6.8 inch" },
              { label: "Technology", value: "Dynamic AMOLED 2X" },
              { label: "Resolution", value: "3120 x 1440" },
            ],
          },
          {
            category: "Performance",
            items: [
              { label: "Processor", value: "Snapdragon 8 Gen 3" },
              { label: "RAM", value: "12GB" },
              { label: "Storage", value: "512GB" },
            ],
          },
          {
            category: "Camera",
            items: [
              { label: "Main Camera", value: "200MP" },
              { label: "Ultra Wide", value: "12MP" },
              { label: "Telephoto", value: "50MP" },
            ],
          },
          {
            category: "Battery",
            items: [
              { label: "Battery", value: "5000mAh" },
              { label: "Charging", value: "45W Fast Charging" },
            ],
          },
        ],
      },
      {
        name: "MacBook Pro 16 Test",
        price: 2499.99,
        category_id: category.id,
        specs: [
          { label: "Brand", value: "Apple" },
          { label: "Screen", value: "16 inch" },
        ],
        specs_detail: [
          {
            category: "Display",
            items: [
              { label: "Screen Size", value: "16 inch" },
              { label: "Technology", value: "Liquid Retina XDR" },
              { label: "Resolution", value: "3456 x 2234" },
            ],
          },
          {
            category: "Performance",
            items: [
              { label: "Chip", value: "M3 Pro" },
              { label: "RAM", value: "18GB" },
              { label: "Storage", value: "512GB SSD" },
            ],
          },
          {
            category: "Graphics",
            items: [
              { label: "GPU", value: "M3 Pro GPU" },
              { label: "GPU Cores", value: "18-core" },
            ],
          },
          {
            category: "System",
            items: [
              { label: "Operating System", value: "macOS Sonoma" },
              { label: "Battery", value: "100Wh" },
            ],
          },
        ],
      },
    ];

    for (const productData of sampleProducts) {
      // Check if product already exists
      const existing = await prisma.product.findFirst({
        where: { name: productData.name },
      });

      if (!existing) {
        await prisma.product.create({
          data: productData,
        });
        console.log(`   ✅ Created: ${productData.name}`);
      } else {
        // Update existing product with new specs
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            specs: productData.specs,
            specs_detail: productData.specs_detail,
          },
        });
        console.log(`   🔄 Updated: ${productData.name}`);
      }
    }

    console.log("✅ Sample products created/updated successfully!");
  } catch (error) {
    console.error("❌ Failed to create sample products:", error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--create-samples")) {
    await createSampleProductsWithSpecs();
  } else if (args.includes("--test")) {
    await testSpecsSync();
  } else {
    console.log("Usage:");
    console.log(
      "  node test-specs-sync.js --create-samples   # Create sample products with nested specs"
    );
    console.log(
      "  node test-specs-sync.js --test             # Test specs sync functionality"
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
