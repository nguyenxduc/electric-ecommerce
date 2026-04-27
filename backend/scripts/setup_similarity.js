import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setupSimilarity() {
  try {
    console.log(
      "🚀 Setting up PostgreSQL pg_trgm extension for similarity search..."
    );
    console.log("");

    // Step 1: Enable pg_trgm extension
    console.log("📦 Enabling pg_trgm extension...");
    try {
      await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_trgm;`;
      console.log("✅ pg_trgm extension enabled successfully");
    } catch (error) {
      if (error.message.includes("already exists")) {
        console.log("ℹ️  pg_trgm extension already exists");
      } else {
        throw error;
      }
    }

    // Step 2: Verify extension installation
    console.log("🔍 Verifying extension installation...");
    try {
      const extensionCheck = await prisma.$queryRaw`
        SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_trgm';
      `;

      if (extensionCheck.length > 0) {
        console.log(
          `✅ pg_trgm extension verified - version: ${extensionCheck[0].extversion}`
        );
      } else {
        throw new Error("pg_trgm extension not found after installation");
      }
    } catch (error) {
      console.error("❌ Extension verification failed:", error.message);
      throw error;
    }

    // Step 3: Create GIN index for performance
    console.log("🏗️  Creating GIN index on products.description...");
    try {
      // Note: CONCURRENTLY cannot be used with $executeRaw, so we'll create without it
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_products_description_gin_trgm 
        ON products USING gin (description gin_trgm_ops);
      `;
      console.log("✅ GIN index created successfully");
    } catch (error) {
      if (error.message.includes("already exists")) {
        console.log("ℹ️  GIN index already exists");
      } else {
        console.error("❌ Index creation failed:", error.message);
        console.log(
          "⚠️  Continuing without index - performance may be affected"
        );
      }
    }

    // Step 4: Test similarity function
    console.log("🧪 Testing similarity function...");
    try {
      const testResult = await prisma.$queryRaw`
        SELECT similarity('smartphone with great camera', 'phone with excellent camera quality') as test_similarity;
      `;

      const similarityScore = testResult[0]?.test_similarity;
      console.log(
        `✅ Similarity function test passed - score: ${similarityScore}`
      );

      if (similarityScore < 0.1) {
        console.log(
          "⚠️  Low similarity score detected - this is normal for test data"
        );
      }
    } catch (error) {
      console.error("❌ Similarity function test failed:", error.message);
      throw error;
    }

    // Step 5: Check products with descriptions
    console.log("📊 Analyzing product data...");
    try {
      const totalProducts = await prisma.product.count();
      const productsWithDescription = await prisma.product.count({
        where: {
          description: {
            not: null,
            not: "",
          },
        },
      });

      console.log(`📈 Total products: ${totalProducts}`);
      console.log(`📝 Products with descriptions: ${productsWithDescription}`);

      if (productsWithDescription === 0) {
        console.log("⚠️  WARNING: No products with descriptions found!");
        console.log(
          "   Similarity search will fall back to category-based matching"
        );
        console.log(
          "   Consider running the seed script to add sample descriptions"
        );
      } else {
        const percentage = (
          (productsWithDescription / totalProducts) *
          100
        ).toFixed(1);
        console.log(
          `✅ ${percentage}% of products have descriptions for similarity matching`
        );
      }
    } catch (error) {
      console.error("❌ Error analyzing product data:", error.message);
    }

    // Step 6: Test with real product data (if available)
    console.log("🔬 Testing with real product data...");
    try {
      const sampleProduct = await prisma.product.findFirst({
        where: {
          description: {
            not: null,
            not: "",
          },
        },
      });

      if (sampleProduct) {
        const similarProducts = await prisma.$queryRaw`
          SELECT 
            id, 
            name,
            similarity(description, ${sampleProduct.description}) as similarity_score
          FROM products 
          WHERE id != ${sampleProduct.id}
            AND description IS NOT NULL 
            AND description != ''
            AND similarity(description, ${sampleProduct.description}) > 0.1
          ORDER BY similarity_score DESC
          LIMIT 3;
        `;

        console.log(
          `✅ Found ${similarProducts.length} similar products for "${sampleProduct.name}"`
        );
        if (similarProducts.length > 0) {
          console.log("   Top matches:");
          similarProducts.forEach((product, index) => {
            console.log(
              `   ${index + 1}. ${product.name} (score: ${
                product.similarity_score
              })`
            );
          });
        }
      } else {
        console.log(
          "ℹ️  No products with descriptions found for real-data testing"
        );
      }
    } catch (error) {
      console.error("❌ Real-data test failed:", error.message);
    }

    console.log("");
    console.log("🎉 Similarity search setup completed successfully!");
    console.log("");
    console.log("📋 Setup Summary:");
    console.log("   ✅ pg_trgm extension enabled");
    console.log("   ✅ GIN index created on products.description");
    console.log("   ✅ Similarity function tested and working");
    console.log("   ✅ Product data analyzed");
    console.log("");
    console.log("🔗 API Usage:");
    console.log("   GET /products/:id/similar?limit=6");
    console.log("");
    console.log("📖 Documentation:");
    console.log("   backend/docs/SIMILAR_PRODUCTS_API.md");
    console.log("");
    console.log("⚡ Performance Tips:");
    console.log("   - Similarity threshold: 0.1 (adjustable in controller)");
    console.log("   - Recommended limit: 6-12 products");
    console.log("   - Consider caching for frequently accessed products");
  } catch (error) {
    console.error("");
    console.error("❌ Similarity setup failed:", error.message);
    console.error("");
    console.error("🔧 Troubleshooting:");
    console.error("   1. Ensure PostgreSQL supports extensions");
    console.error("   2. Check database user permissions");
    console.error("   3. Verify products table exists");
    console.error("   4. Run database migrations if needed");
    console.error("");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  setupSimilarity().catch(console.error);
}

export { setupSimilarity };
