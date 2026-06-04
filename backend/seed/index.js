import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db.js";
import { getProductRichContent } from "./productContent.js";
import {
  CATEGORY_IMAGE_URLS,
  SEED_PRODUCT_IMAGES,
} from "./productImages.js";
import {
  PRODUCTS_CATALOG,
  resolveCatalogProduct,
} from "./productsCatalog.js";

async function clearDatabase() {
  await prisma.aiMessage.deleteMany();
  await prisma.aiChat.deleteMany();
  await prisma.message.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.productFilterValue.deleteMany();
  await prisma.filterOption.deleteMany();
  await prisma.filterKey.deleteMany();
  await prisma.productEmbedding.deleteMany();
  await prisma.productColor.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.product.deleteMany();
  await prisma.subCategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();
}

function enrichProduct(product) {
  const img = SEED_PRODUCT_IMAGES[product.name] || product.img;
  const rich = getProductRichContent(product.name, img);
  return {
    ...product,
    description: rich.description,
    specs_detail: rich.specs_detail ?? product.specs_detail,
    img,
  };
}

const REVIEW_COMMENTS = [
  "Excellent product, exactly as described. Fast delivery and careful packaging.",
  "Quality exceeded expectations after a week of use. Will buy again for family.",
  "Fair price for the market. Support team was helpful over chat.",
  "Brand-new sealed unit, great battery life, beautiful camera. Highly recommend!",
  "Sound and display match what I saw in online reviews. Five stars.",
  "Solid for the price, arrived on time. Hope the store keeps deals like this.",
  "Minor nitpick on included accessories, but the main product is great.",
  "Amazing quality, exactly as described. Would buy again.",
  "Great battery, sharp screen, smooth gaming. Very happy.",
  "Best noise canceling I have tried — perfect for flights.",
  "4K video editing is smooth; fans get loud under full load but acceptable.",
  "Console runs games smoothly; SSD loads are impressively fast.",
  "Accurate health tracking, comfortable to wear all day.",
  "Great for notes and drawing; S Pen is responsive. Ideal for online classes.",
  "Sharp photos and stable video — worth it for content creators.",
  "A bit heavy in the bag, but premium build worthy of a flagship.",
  "Color looks better in person; the Titanium finish is stunning.",
  "Clear return policy and helpful support — confident purchase.",
  "Works great for office work and Zoom calls — mic and webcam are fine.",
  "Setup was easy and performance has been flawless so far.",
];

async function seedUsers() {
  const password = await bcrypt.hash("password123", 10);

  const users = [
    {
      name: "Admin User",
      email: "admin@example.com",
      password_digest: password,
      role: "admin",
      email_verified: true,
    },
    {
      name: "John Doe",
      email: "john@example.com",
      password_digest: password,
      role: "user",
      phone: "0123456789",
      address: "123 Sample Street, HCMC",
      email_verified: true,
    },
    {
      name: "Jane Smith",
      email: "jane@example.com",
      password_digest: password,
      role: "user",
      phone: "0987654321",
      address: "456 Main Avenue, Hanoi",
      email_verified: true,
    },
    {
      name: "Bob Johnson",
      email: "bob@example.com",
      password_digest: password,
      role: "user",
      phone: "0111222333",
      address: "789 Park Road, Da Nang",
      email_verified: true,
    },
    {
      name: "Alice Williams",
      email: "alice@example.com",
      password_digest: password,
      role: "user",
      phone: "0444555666",
      address: "321 Ocean Drive, Nha Trang",
      email_verified: true,
    },
    {
      name: "Charlie Brown",
      email: "charlie@example.com",
      password_digest: password,
      role: "user",
      phone: "0777888999",
      address: "654 Mountain View, Da Lat",
      email_verified: true,
    },
    {
      name: "Diana Prince",
      email: "diana@example.com",
      password_digest: password,
      role: "user",
      phone: "0333444555",
      address: "987 Forest Lane, Can Tho",
      email_verified: true,
    },
    {
      name: "Edward Norton",
      email: "edward@example.com",
      password_digest: password,
      role: "user",
      phone: "0666777888",
      address: "147 River Street, Hue",
      email_verified: true,
    },
  ];

  const createdUsers = [];
  for (let i = 0; i < users.length; i++) {
    const created = await prisma.user.create({ data: users[i] });
    createdUsers.push(created);
  }

  return { admin: createdUsers[0], users: createdUsers };
}

async function seedCategories() {
  const categories = [
    {
      name: "Smartphones",
      slug: "smartphones",
      image_url: CATEGORY_IMAGE_URLS.smartphones,
      description: "Latest smartphones and mobile devices",
    },
    {
      name: "Laptops",
      slug: "laptops",
      image_url: CATEGORY_IMAGE_URLS.laptops,
      description: "Laptops and ultrabooks for work and gaming",
    },
    {
      name: "Tablets",
      slug: "tablets",
      image_url: CATEGORY_IMAGE_URLS.tablets,
      description: "Tablets and iPads for productivity",
    },
    {
      name: "Headphones",
      slug: "headphones",
      image_url: CATEGORY_IMAGE_URLS.headphones,
      description: "Wireless and wired headphones",
    },
    {
      name: "Smartwatches",
      slug: "smartwatches",
      image_url: CATEGORY_IMAGE_URLS.smartwatches,
      description: "Smartwatches and fitness trackers",
    },
    {
      name: "Cameras",
      slug: "cameras",
      image_url: CATEGORY_IMAGE_URLS.cameras,
      description: "Digital cameras and accessories",
    },
    {
      name: "Gaming",
      slug: "gaming",
      image_url: CATEGORY_IMAGE_URLS.gaming,
      description: "Gaming consoles and accessories",
    },
    {
      name: "Accessories",
      slug: "accessories",
      image_url: CATEGORY_IMAGE_URLS.accessories,
      description: "Phone cases, chargers, and more",
    },
  ];

  const createdCategories = await Promise.all(
    categories.map((cat) => prisma.category.create({ data: cat }))
  );

  return createdCategories;
}

async function seedSubCategories(categories) {
  const subCategories = [
    {
      name: "Android",
      image_url: SEED_PRODUCT_IMAGES["Galaxy S24 Ultra"][0],
      description: "Android smartphones",
      category_id: categories[0].id,
    },
    {
      name: "iOS",
      image_url: SEED_PRODUCT_IMAGES["iPhone 15 Pro Max"][0],
      description: "Apple iPhones",
      category_id: categories[0].id,
    },
    {
      name: "Ultrabook",
      image_url: SEED_PRODUCT_IMAGES["Dell XPS 15"][0],
      description: "Thin and light laptops",
      category_id: categories[1].id,
    },
    {
      name: "Gaming Laptop",
      image_url:
        "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6572/6572156_sd.jpg",
      description: "High-performance gaming laptops",
      category_id: categories[1].id,
    },
    {
      name: "iPad",
      image_url:
        "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6447/6447382_sd.jpg",
      description: "Apple iPads",
      category_id: categories[2].id,
    },
    {
      name: "Android Tablet",
      image_url: SEED_PRODUCT_IMAGES["Samsung Galaxy Tab S9"][0],
      description: "Android tablets",
      category_id: categories[2].id,
    },
    {
      name: "Wireless",
      image_url:
        "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6505/6505727_sd.jpg",
      description: "Wireless headphones",
      category_id: categories[3].id,
    },
    {
      name: "Wired",
      image_url:
        "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6585/6585614_sd.jpg",
      description: "Wired headphones",
      category_id: categories[3].id,
    },
  ];

  const createdSubCategories = await Promise.all(
    subCategories.map((sub) => prisma.subCategory.create({ data: sub }))
  );

  return createdSubCategories;
}

async function seedFilterKeys() {
  const filterKeys = [
    {
      key: "brand",
      label: "Brand",
      description: "Product brand",
      data_type: "string",
      order: 1,
    },
    {
      key: "ram",
      label: "RAM",
      description: "Memory size",
      data_type: "string",
      order: 2,
    },
    {
      key: "processor",
      label: "Processor",
      description: "CPU model",
      data_type: "string",
      order: 3,
    },
    {
      key: "screen_size",
      label: "Screen Size",
      description: "Display size",
      data_type: "string",
      order: 4,
    },
    {
      key: "gpu_brand",
      label: "GPU Brand",
      description: "Graphics card brand",
      data_type: "string",
      order: 5,
    },
    {
      key: "storage",
      label: "Storage",
      description: "Storage capacity",
      data_type: "string",
      order: 6,
    },
    {
      key: "price_range",
      label: "Price Range",
      description: "Price range filter",
      data_type: "range",
      order: 7,
    },
    {
      key: "discount",
      label: "Discount",
      description: "Discount percentage",
      data_type: "range",
      order: 8,
    },
  ];

  const createdFilterKeys = await Promise.all(
    filterKeys.map((key) => prisma.filterKey.create({ data: key }))
  );

  return createdFilterKeys;
}

async function seedFilterOptions(filterKeys, categories) {
  // Map filter keys by key name for quick lookup
  const filterKeyMap = filterKeys.reduce((map, key) => {
    map[key.key] = key;
    return map;
  }, {});

  const filterOptions = [
    // Brand options
    {
      filter_key_id: filterKeyMap.brand.id,
      value: "Apple",
      display_value: "Apple",
      order: 1,
    },
    {
      filter_key_id: filterKeyMap.brand.id,
      value: "Samsung",
      display_value: "Samsung",
      order: 2,
    },
    {
      filter_key_id: filterKeyMap.brand.id,
      value: "ASUS",
      display_value: "ASUS",
      order: 3,
    },
    {
      filter_key_id: filterKeyMap.brand.id,
      value: "Sony",
      display_value: "Sony",
      order: 4,
    },
    {
      filter_key_id: filterKeyMap.brand.id,
      value: "Canon",
      display_value: "Canon",
      order: 5,
    },
    {
      filter_key_id: filterKeyMap.brand.id,
      value: "Microsoft",
      display_value: "Microsoft",
      order: 6,
    },
    {
      filter_key_id: filterKeyMap.brand.id,
      value: "Dell",
      display_value: "Dell",
      order: 7,
    },

    // RAM options
    {
      filter_key_id: filterKeyMap.ram.id,
      value: "8GB",
      display_value: "8GB",
      order: 1,
    },
    {
      filter_key_id: filterKeyMap.ram.id,
      value: "12GB",
      display_value: "12GB",
      order: 2,
    },
    {
      filter_key_id: filterKeyMap.ram.id,
      value: "16GB",
      display_value: "16GB",
      order: 3,
    },
    {
      filter_key_id: filterKeyMap.ram.id,
      value: "32GB",
      display_value: "32GB",
      order: 4,
    },

    // Processor options
    {
      filter_key_id: filterKeyMap.processor.id,
      value: "A17 Pro",
      display_value: "A17 Pro",
      order: 1,
    },
    {
      filter_key_id: filterKeyMap.processor.id,
      value: "M3 Max",
      display_value: "M3 Max",
      order: 2,
    },
    {
      filter_key_id: filterKeyMap.processor.id,
      value: "M2",
      display_value: "M2",
      order: 3,
    },
    {
      filter_key_id: filterKeyMap.processor.id,
      value: "Snapdragon 8 Gen 3",
      display_value: "Snapdragon 8 Gen 3",
      order: 4,
    },
    {
      filter_key_id: filterKeyMap.processor.id,
      value: "Snapdragon 8 Gen 2",
      display_value: "Snapdragon 8 Gen 2",
      order: 5,
    },
    {
      filter_key_id: filterKeyMap.processor.id,
      value: "Intel i7-13700H",
      display_value: "Intel i7-13700H",
      order: 6,
    },

    // Screen size options
    {
      filter_key_id: filterKeyMap.screen_size.id,
      value: "6.7",
      display_value: "6.7 inch",
      query_value: "6.7",
      order: 1,
    },
    {
      filter_key_id: filterKeyMap.screen_size.id,
      value: "6.8",
      display_value: "6.8 inch",
      query_value: "6.8",
      order: 2,
    },
    {
      filter_key_id: filterKeyMap.screen_size.id,
      value: "11",
      display_value: "11 inch",
      query_value: "11",
      order: 3,
    },
    {
      filter_key_id: filterKeyMap.screen_size.id,
      value: "12.9",
      display_value: "12.9 inch",
      query_value: "12.9",
      order: 4,
    },
    {
      filter_key_id: filterKeyMap.screen_size.id,
      value: "16",
      display_value: "16 inch",
      query_value: "16",
      order: 5,
    },
    {
      filter_key_id: filterKeyMap.screen_size.id,
      value: "16.2",
      display_value: "16.2 inch",
      query_value: "16.2",
      order: 6,
    },

    // GPU Brand options
    {
      filter_key_id: filterKeyMap.gpu_brand.id,
      value: "Apple",
      display_value: "Apple",
      order: 1,
    },
    {
      filter_key_id: filterKeyMap.gpu_brand.id,
      value: "NVIDIA",
      display_value: "NVIDIA",
      order: 2,
    },
    {
      filter_key_id: filterKeyMap.gpu_brand.id,
      value: "AMD",
      display_value: "AMD",
      order: 3,
    },

    // Storage options
    {
      filter_key_id: filterKeyMap.storage.id,
      value: "128GB",
      display_value: "128GB",
      order: 1,
    },
    {
      filter_key_id: filterKeyMap.storage.id,
      value: "256GB",
      display_value: "256GB",
      order: 2,
    },
    {
      filter_key_id: filterKeyMap.storage.id,
      value: "512GB",
      display_value: "512GB SSD",
      query_value: "512GB",
      order: 3,
    },
    {
      filter_key_id: filterKeyMap.storage.id,
      value: "1TB",
      display_value: "1TB SSD",
      query_value: "1TB",
      order: 4,
    },
    {
      filter_key_id: filterKeyMap.storage.id,
      value: "825GB",
      display_value: "825GB SSD",
      query_value: "825GB",
      order: 5,
    },

    // Price range options (category specific)
    {
      filter_key_id: filterKeyMap.price_range.id,
      value: "0-500",
      display_value: "Under $500",
      query_value: "<500",
      category_id: categories[0].id, // Smartphones
      order: 1,
    },
    {
      filter_key_id: filterKeyMap.price_range.id,
      value: "500-1000",
      display_value: "$500 - $1000",
      query_value: "500-1000",
      category_id: categories[0].id,
      order: 2,
    },
    {
      filter_key_id: filterKeyMap.price_range.id,
      value: "1000-2000",
      display_value: "$1000 - $2000",
      query_value: "1000-2000",
      category_id: categories[1].id, // Laptops
      order: 1,
    },

    // Discount options
    {
      filter_key_id: filterKeyMap.discount.id,
      value: "10",
      display_value: "10% or more",
      query_value: ">=10",
      order: 1,
    },
    {
      filter_key_id: filterKeyMap.discount.id,
      value: "20",
      display_value: "20% or more",
      query_value: ">=20",
      order: 2,
    },
    {
      filter_key_id: filterKeyMap.discount.id,
      value: "30",
      display_value: "30% or more",
      query_value: ">=30",
      order: 3,
    },
  ];

  const createdFilterOptions = await Promise.all(
    filterOptions.map((option) => prisma.filterOption.create({ data: option }))
  );

  return createdFilterOptions;
}

async function seedProducts(categories, subCategories) {
  const products = PRODUCTS_CATALOG.map((entry) =>
    resolveCatalogProduct(entry, categories, subCategories)
  );

  const createdProducts = [];
  for (const product of products) {
    const data = enrichProduct(product);
    const created = await prisma.product.create({
      data: {
        name: data.name,
        price: data.price,
        discount: data.discount,
        quantity: data.quantity,
        sold: data.sold,
        rating: data.rating,
        img: data.img,
        specs: data.specs,
        specs_detail: data.specs_detail,
        color: data.color,
        description: data.description,
        category_id: data.category_id,
        sub_category_id: data.sub_category_id,
        product_colors: {
          create: parseColorsWithQuantities(data.color, data.quantity),
        },
      },
    });
    createdProducts.push(created);
  }

  return createdProducts;
}


// Helper function to parse colors and distribute quantities
function parseColorsWithQuantities(colorJson, totalQuantity) {
  try {
    const colors = JSON.parse(colorJson);
    if (!Array.isArray(colors) || colors.length === 0) {
      return [];
    }

    // Distribute total quantity evenly among colors
    const perColorQuantity = Math.floor(totalQuantity / colors.length);
    const remainder = totalQuantity % colors.length;

    return colors.map((color, index) => ({
      name: color.name || "",
      code: color.code || "",
      quantity: perColorQuantity + (index < remainder ? 1 : 0),
    }));
  } catch (error) {
    console.error("Error parsing colors:", error);
    return [];
  }
}

async function seedProductColors(products) {
  // Product colors are already created in seedProducts function
  // This function is kept for backward compatibility
  return [];
}

async function seedProductFilterValues(products, filterOptions, filterKeys) {
  // Create a map for easy lookup
  const optionMap = {};
  filterOptions.forEach((option) => {
    if (!optionMap[option.filter_key_id]) {
      optionMap[option.filter_key_id] = {};
    }
    optionMap[option.filter_key_id][option.value] = option;
  });

  const keyMap = filterKeys.reduce((map, key) => {
    map[key.key] = key;
    return map;
  }, {});

  const productFilterValues = [];

  for (const product of products) {
    try {
      const specs = Array.isArray(product.specs) ? product.specs : [];

      // Extract brand from specs
      const brandSpec = specs.find(
        (spec) => spec.label?.toLowerCase() === "brand"
      );
      if (
        brandSpec &&
        brandSpec.value &&
        keyMap.brand &&
        optionMap[keyMap.brand.id]?.[brandSpec.value]
      ) {
        productFilterValues.push({
          product_id: product.id,
          filter_key_id: keyMap.brand.id,
          option_id: optionMap[keyMap.brand.id][brandSpec.value].id,
        });
      }

      // Extract RAM from specs
      const ramSpec = specs.find((spec) => spec.label?.toLowerCase() === "ram");
      if (
        ramSpec &&
        ramSpec.value &&
        keyMap.ram &&
        optionMap[keyMap.ram.id]?.[ramSpec.value]
      ) {
        productFilterValues.push({
          product_id: product.id,
          filter_key_id: keyMap.ram.id,
          option_id: optionMap[keyMap.ram.id][ramSpec.value].id,
        });
      }

      // Extract processor from specs
      const processorSpec = specs.find(
        (spec) => spec.label?.toLowerCase() === "processor"
      );
      if (
        processorSpec &&
        processorSpec.value &&
        keyMap.processor &&
        optionMap[keyMap.processor.id]?.[processorSpec.value]
      ) {
        productFilterValues.push({
          product_id: product.id,
          filter_key_id: keyMap.processor.id,
          option_id: optionMap[keyMap.processor.id][processorSpec.value].id,
        });
      }

      // Extract GPU brand from specs
      const gpuSpec = specs.find(
        (spec) => spec.label?.toLowerCase() === "gpu brand"
      );
      if (
        gpuSpec &&
        gpuSpec.value &&
        keyMap.gpu_brand &&
        optionMap[keyMap.gpu_brand.id]?.[gpuSpec.value]
      ) {
        productFilterValues.push({
          product_id: product.id,
          filter_key_id: keyMap.gpu_brand.id,
          option_id: optionMap[keyMap.gpu_brand.id][gpuSpec.value].id,
        });
      }

      // Extract storage from specs
      const storageSpec = specs.find(
        (spec) => spec.label?.toLowerCase() === "storage"
      );
      if (storageSpec && storageSpec.value) {
        // Try to match storage value with options
        const storageValue = String(storageSpec.value)
          .replace(" SSD", "")
          .replace("GB", "")
          .trim();
        if (keyMap.storage && optionMap[keyMap.storage.id]?.[storageValue]) {
          productFilterValues.push({
            product_id: product.id,
            filter_key_id: keyMap.storage.id,
            option_id: optionMap[keyMap.storage.id][storageValue].id,
          });
        }
      }

      // Add discount filter if applicable
      if (product.discount > 0 && keyMap.discount) {
        const discountPercent = Math.round(
          (product.discount / product.price) * 100
        );
        if (discountPercent >= 30 && optionMap[keyMap.discount.id]?.["30"]) {
          productFilterValues.push({
            product_id: product.id,
            filter_key_id: keyMap.discount.id,
            option_id: optionMap[keyMap.discount.id]["30"].id,
          });
        } else if (
          discountPercent >= 20 &&
          optionMap[keyMap.discount.id]?.["20"]
        ) {
          productFilterValues.push({
            product_id: product.id,
            filter_key_id: keyMap.discount.id,
            option_id: optionMap[keyMap.discount.id]["20"].id,
          });
        } else if (
          discountPercent >= 10 &&
          optionMap[keyMap.discount.id]?.["10"]
        ) {
          productFilterValues.push({
            product_id: product.id,
            filter_key_id: keyMap.discount.id,
            option_id: optionMap[keyMap.discount.id]["10"].id,
          });
        }
      }
    } catch (error) {
      console.error(
        `Error creating filter values for product ${product.id}:`,
        error
      );
    }
  }

  if (productFilterValues.length > 0) {
    await prisma.productFilterValue.createMany({
      data: productFilterValues,
      skipDuplicates: true,
    });
  }

  return productFilterValues;
}

async function seedCoupons() {
  const coupons = [
    {
      code: "WELCOME10",
      description: "10% off for new users",
      discount_type: "percent",
      discount_value: 10,
      min_order: 100,
      usage_limit: 100,
      used_count: 5,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      code: "FLAT50",
      description: "Flat $50 off",
      discount_type: "fixed",
      discount_value: 50,
      min_order: 300,
      usage_limit: 50,
      used_count: 10,
      expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
    {
      code: "SUMMER20",
      description: "20% off summer sale",
      discount_type: "percent",
      discount_value: 20,
      min_order: 200,
      usage_limit: 200,
      used_count: 25,
      expires_at: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    },
    {
      code: "NEW100",
      description: "$100 off orders over $1000",
      discount_type: "fixed",
      discount_value: 100,
      min_order: 1000,
      usage_limit: 30,
      used_count: 3,
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
    {
      code: "STUDENT15",
      description: "15% student discount",
      discount_type: "percent",
      discount_value: 15,
      min_order: 150,
      usage_limit: 500,
      used_count: 50,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    {
      code: "VIP25",
      description: "25% off for VIP members",
      discount_type: "percent",
      discount_value: 25,
      min_order: 500,
      usage_limit: 100,
      used_count: 15,
      expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    },
    {
      code: "FLASH30",
      description: "30% flash sale",
      discount_type: "percent",
      discount_value: 30,
      min_order: 400,
      usage_limit: 50,
      used_count: 20,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      code: "FREESHIP",
      description: "Free shipping on orders over $50",
      discount_type: "fixed",
      discount_value: 10, // Assuming $10 shipping cost
      min_order: 50,
      usage_limit: 1000,
      used_count: 200,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  ];

  const createdCoupons = await Promise.all(
    coupons.map((coupon) => prisma.coupon.create({ data: coupon }))
  );

  return createdCoupons;
}

async function seedOrders(users, products) {
  const orders = [];

  for (let i = 0; i < 15; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const product = products[Math.floor(Math.random() * products.length)];
    const quantity = Math.floor(Math.random() * 3) + 1;
    const unitPrice = Number(product.price) - Number(product.discount || 0);
    const totalPrice = unitPrice * quantity;

    // Parse colors to get a random color
    let selectedColor = null;
    try {
      const colors = JSON.parse(product.color || "[]");
      if (Array.isArray(colors) && colors.length > 0) {
        selectedColor = colors[Math.floor(Math.random() * colors.length)]?.name;
      }
    } catch (error) {
      // Ignore error
    }

    const order = await prisma.order.create({
      data: {
        user_id: user.id,
        order_number: `ORD-${Date.now()}-${i}`,
        total_amount: totalPrice,
        status: ["pending", "confirmed", "processing", "shipped", "delivered"][
          i % 5
        ],
        payment_method: [
          "credit_card",
          "debit_card",
          "cash_on_delivery",
          "paypal",
          "momo",
          "bank_transfer",
        ][i % 6],
        shipping_address: JSON.stringify({
          street: `${Math.floor(Math.random() * 999) + 1} Sample Street`,
          city: ["HCMC", "Hanoi", "Da Nang", "Nha Trang", "Can Tho", "Da Lat"][
            i % 6
          ],
          district: [
            "District 1",
            "Cau Giay",
            "Hai Chau",
            "Ninh Kieu",
            "District 3",
          ][i % 5],
          country: "VN",
          zip_code: "70000",
        }),
        receiver_name: user.name || "Customer",
        receiver_phone: user.phone || "0000000000",
        order_items: {
          create: [
            {
              product_id: product.id,
              quantity: quantity,
              unit_price: unitPrice,
              total_price: totalPrice,
              color: selectedColor,
            },
          ],
        },
      },
    });

    orders.push(order);
  }

  return orders;
}

async function seedReviews(users, products) {
  const reviews = [];
  const customers = users.filter((u) => u.email !== "admin@example.com");
  const usedPairs = new Set();
  const ratingPool = [5, 5, 5, 4, 4, 4, 4, 3];

  for (const product of products) {
    const reviewCount = 5 + (Number(product.id) % 3);

    for (let i = 0; i < reviewCount; i++) {
      let user = customers[i % customers.length];
      let pairKey = `${user.id}-${product.id}`;
      let attempts = 0;

      while (usedPairs.has(pairKey) && attempts < customers.length) {
        user = customers[(i + attempts) % customers.length];
        pairKey = `${user.id}-${product.id}`;
        attempts += 1;
      }
      if (usedPairs.has(pairKey)) continue;
      usedPairs.add(pairKey);

      const commentIndex =
        (Number(product.id) * 7 + i * 3) % REVIEW_COMMENTS.length;
      const rating = ratingPool[(Number(product.id) + i) % ratingPool.length];

      const review = await prisma.review.create({
        data: {
          user_id: user.id,
          product_id: product.id,
          rating,
          comment: REVIEW_COMMENTS[commentIndex],
        },
      });
      reviews.push(review);
    }
  }

  return reviews;
}

async function seedCarts(users, products) {
  const carts = [];

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const product = products[Math.floor(Math.random() * products.length)];

    // Parse colors to get a random color
    let selectedColor = {};
    try {
      const colors = JSON.parse(product.color || "[]");
      if (Array.isArray(colors) && colors.length > 0) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        if (color) {
          selectedColor = { name: color.name || "", code: color.code || "" };
        }
      }
    } catch (error) {
      // Ignore error
    }

    const cart = await prisma.cart.create({
      data: {
        user_id: user.id,
        cart_items: {
          create: [
            {
              product_id: product.id,
              quantity: Math.floor(Math.random() * 3) + 1,
              color: selectedColor,
            },
          ],
        },
      },
    });

    carts.push(cart);
  }

  return carts;
}

async function seedWishlists(users, products) {
  const wishlists = [];

  for (let i = 0; i < 20; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const product = products[Math.floor(Math.random() * products.length)];

    try {
      const wishlist = await prisma.wishlist.create({
        data: {
          user_id: user.id,
          product_id: product.id,
        },
      });
      wishlists.push(wishlist);
    } catch (error) {
      // Skip if already exists (unique constraint)
      if (error.code !== "P2002") {
        console.error("Error creating wishlist:", error);
      }
    }
  }

  return wishlists;
}

async function seedSettings() {
  const defaultSettings = [
    {
      key: "bank_id",
      value: process.env.BANK_ID || "tpbank",
      description: "Bank code for transfer QR payments",
      category: "bank",
      data_type: "string",
      is_public: false,
    },
    {
      key: "bank_account_no",
      value: process.env.BANK_ACCOUNT_NO || "1234567890",
      description: "Bank account number",
      category: "bank",
      data_type: "string",
      is_public: false,
    },
    {
      key: "bank_account_name",
      value: process.env.BANK_ACCOUNT_NAME || "Tech Shop",
      description: "Bank account holder name",
      category: "bank",
      data_type: "string",
      is_public: false,
    },
    {
      key: "qr_template",
      value: process.env.QR_TEMPLATE || "compact2",
      description: "Template QR code (compact2, compact, qr_only, print)",
      category: "bank",
      data_type: "string",
      is_public: false,
    },
    {
      key: "shipping_fee",
      value: process.env.SHIPPING_FEE || "9.99",
      description: "Default shipping fee (USD)",
      category: "shipping",
      data_type: "number",
      is_public: true,
    },
    {
      key: "free_shipping_threshold",
      value: process.env.FREE_SHIPPING_THRESHOLD || "199",
      description: "Free shipping threshold (USD)",
      category: "shipping",
      data_type: "number",
      is_public: true,
    },
    {
      key: "store_name",
      value: process.env.STORE_NAME || "Tech Shop",
      description: "Store display name",
      category: "general",
      data_type: "string",
      is_public: true,
    },
    {
      key: "store_email",
      value: process.env.STORE_EMAIL || "contact@techshop.com",
      description: "Store contact email",
      category: "general",
      data_type: "string",
      is_public: true,
    },
    {
      key: "store_phone",
      value: process.env.STORE_PHONE || "0123456789",
      description: "Store contact phone",
      category: "general",
      data_type: "string",
      is_public: true,
    },
    {
      key: "store_address",
      value: process.env.STORE_ADDRESS || "123 Main Street, Ho Chi Minh City",
      description: "Store address",
      category: "general",
      data_type: "string",
      is_public: true,
    },
    {
      key: "currency",
      value: "USD",
      description: "Store currency",
      category: "general",
      data_type: "string",
      is_public: true,
    },
    {
      key: "enable_momo",
      value: "true",
      description: "Enable MoMo payments",
      category: "payment",
      data_type: "boolean",
      is_public: true,
    },
    {
      key: "momo_partner_code",
      value: process.env.MOMO_PARTNER_CODE || "MOMO",
      description: "MoMo partner code",
      category: "payment",
      data_type: "string",
      is_public: false,
    },
  ];

  const createdSettings = [];
  for (const setting of defaultSettings) {
    try {
      const result = await prisma.setting.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          description: setting.description,
          category: setting.category,
          data_type: setting.data_type,
          is_public: setting.is_public,
          updated_at: new Date(),
        },
        create: setting,
      });
      createdSettings.push(result);
    } catch (error) {
      console.error(`Error seeding setting ${setting.key}:`, error);
    }
  }

  return createdSettings;
}

async function seedChats(users) {
  const chats = [];

  for (let i = 0; i < 5; i++) {
    const user = users[Math.floor(Math.random() * users.length)];

    const chat = await prisma.chat.create({
      data: {
        user_id: user.id,
        status: ["open", "closed", "resolved"][Math.floor(Math.random() * 3)],
        messages: {
          create: [
            {
              sender_id: user.id,
              content: `Hello, I need help with my order #ORD-${Date.now()}`,
              is_read: Math.random() > 0.5,
            },
            {
              sender_id: users[0].id, // Admin user
              content:
                "Hi, I'd be happy to help you with that. Can you provide your order number?",
              is_read: true,
            },
          ],
        },
      },
    });

    chats.push(chat);
  }

  return chats;
}

async function main() {
  console.log("Starting database seeding...");
  console.log("Clearing existing data...");

  await clearDatabase();
  console.log("✓ Database cleared");

  const { admin, users } = await seedUsers();
  console.log(
    `✓ Created ${users.length} users (1 admin, ${users.length - 1} customers)`
  );

  const categories = await seedCategories();
  console.log(`✓ Created ${categories.length} categories`);

  const subCategories = await seedSubCategories(categories);
  console.log(`✓ Created ${subCategories.length} subcategories`);

  const filterKeys = await seedFilterKeys();
  console.log(`✓ Created ${filterKeys.length} filter keys`);

  const filterOptions = await seedFilterOptions(filterKeys, categories);
  console.log(`✓ Created ${filterOptions.length} filter options`);

  const products = await seedProducts(categories, subCategories);
  console.log(`✓ Created ${products.length} products`);

  const productColors = await seedProductColors(products);
  console.log(`✓ Created product colors`);

  const productFilterValues = await seedProductFilterValues(
    products,
    filterOptions,
    filterKeys
  );
  console.log(`✓ Created ${productFilterValues.length} product filter values`);

  const coupons = await seedCoupons();
  console.log(`✓ Created ${coupons.length} coupons`);

  const orders = await seedOrders(users, products);
  console.log(`✓ Created ${orders.length} orders`);

  const reviews = await seedReviews(users, products);
  console.log(`✓ Created ${reviews.length} reviews`);

  const carts = await seedCarts(users, products);
  console.log(`✓ Created ${carts.length} carts`);

  const wishlists = await seedWishlists(users, products);
  console.log(`✓ Created ${wishlists.length} wishlists`);

  const chats = await seedChats(users);
  console.log(`✓ Created ${chats.length} chats with messages`);

  const settings = await seedSettings();
  console.log(`✓ Created ${settings.length} settings`);

  console.log("\n" + "=".repeat(50));
  console.log("✅ Seed completed successfully!");
  console.log("=".repeat(50));
  console.log({
    admin: { id: admin.id?.toString?.(), email: admin.email },
    totalUsers: users.length,
    totalCategories: categories.length,
    totalSubCategories: subCategories.length,
    totalProducts: products.length,
    totalFilterKeys: filterKeys.length,
    totalFilterOptions: filterOptions.length,
    totalCoupons: coupons.length,
    totalOrders: orders.length,
    totalReviews: reviews.length,
    totalCarts: carts.length,
    totalWishlists: wishlists.length,
    totalChats: chats.length,
    totalSettings: settings.length,
  });
  console.log("\n🌱 Database is now seeded and ready to use!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
