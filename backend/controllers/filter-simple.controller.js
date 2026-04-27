import { prisma } from "../lib/db.js";

export const getFilterMetadata = async (req, res) => {
  try {
    console.log("🔍 Getting filter metadata (simple version)");

    // Fallback static data
    const fallbackFilters = [
      {
        key: "brand",
        label: "Brand",
        options: [
          "Apple",
          "Samsung",
          "Google",
          "OnePlus",
          "Sony",
          "Microsoft",
          "Dell",
          "HP",
          "Lenovo",
        ],
      },
      {
        key: "ram",
        label: "RAM",
        options: ["4GB", "6GB", "8GB", "12GB", "16GB", "32GB"],
      },
      {
        key: "drive_size",
        label: "Storage",
        options: ["128GB", "256GB", "512GB", "1TB"],
      },
      {
        key: "color",
        label: "Color",
        options: ["Black", "White", "Silver", "Gold", "Blue"],
      },
      {
        key: "discount",
        label: "Discount",
        options: ["10% or more", "20% or more", "30% or more"],
      },
      {
        key: "rating",
        label: "Rating",
        options: ["4.0+ Stars", "4.5+ Stars"],
      },
    ];

    try {
      // Try to get from database first
      const filterKeys = await prisma.filterKey.findMany({
        where: { is_active: true },
        include: {
          filter_options: {
            where: { is_active: true, category_id: null },
            orderBy: { value: "asc" },
          },
        },
        orderBy: { order: "asc" },
      });

      if (filterKeys.length > 0) {
        const result = [];
        filterKeys.forEach((filterKey) => {
          if (filterKey.filter_options.length > 0) {
            result.push({
              key: filterKey.key,
              label: filterKey.label,
              options: filterKey.filter_options.map(
                (opt) => opt.display_value || opt.value
              ),
            });
          }
        });

        if (result.length > 0) {
          console.log("✅ Using database filters:", result.length);
          return res.json({ success: true, data: result });
        }
      }
    } catch (dbError) {
      console.log("⚠️ Database error, using fallback:", dbError.message);
    }

    // Use fallback data
    console.log("✅ Using fallback filters");
    res.json({ success: true, data: fallbackFilters });
  } catch (error) {
    console.error("❌ Filter error:", error);
    res.json({
      success: true,
      data: [
        { key: "brand", label: "Brand", options: ["Apple", "Samsung"] },
        {
          key: "discount",
          label: "Discount",
          options: ["10% or more", "20% or more"],
        },
      ],
    });
  }
};
