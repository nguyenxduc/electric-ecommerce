import { PrismaClient } from "@prisma/client";
import { syncFilterOptionsFromProducts } from "./controllers/filter.controller.js";

const prisma = new PrismaClient();

async function testSyncDirect() {
  console.log("🧪 Testing Sync Filter Options Directly...");

  try {
    // Mock request and response objects
    const req = { query: {} };
    const res = {
      json: (data) => {
        console.log(
          "✅ Sync Response:",
          JSON.stringify(
            data,
            (key, value) =>
              typeof value === "bigint" ? value.toString() : value,
            2
          )
        );
      },
      status: (code) => ({
        json: (data) => {
          console.log(
            `❌ Error Response (${code}):`,
            JSON.stringify(data, null, 2)
          );
        },
      }),
    };

    // Call the sync function directly
    await syncFilterOptionsFromProducts(req, res);

    // Check what filter keys were created
    console.log("\n📊 Filter Keys in Database:");
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
      console.log(`\n${key.label} (${key.key}):`);
      key.filter_options.forEach((option) => {
        console.log(`  - ${option.display_value || option.value}`);
      });
      if (key.filter_options.length === 5) {
        console.log("  - ... (showing first 5)");
      }
    });

    // Test filter metadata API
    console.log("\n🔍 Testing Filter Metadata:");
    const metadataReq = { query: {} };
    const metadataRes = {
      json: (data) => {
        console.log("Filter Metadata:", JSON.stringify(data, null, 2));
      },
      status: (code) => ({
        json: (data) => {
          console.log(
            `❌ Metadata Error (${code}):`,
            JSON.stringify(data, null, 2)
          );
        },
      }),
    };

    const { getFilterMetadata } = await import(
      "./controllers/filter.controller.js"
    );
    await getFilterMetadata(metadataReq, metadataRes);
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testSyncDirect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
