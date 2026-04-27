import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db.js";

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
      image_url:
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:300:300/q:90/plain/https://cellphones.com.vn/media/catalog/product/i/p/iphone_air-3_2.jpg",
      description: "Latest smartphones and mobile devices",
    },
    {
      name: "Laptops",
      slug: "laptops",
      image_url:
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:300:300/q:90/plain/https://cellphones.com.vn/media/catalog/product/m/a/macbook_13.png",
      description: "Laptops and ultrabooks for work and gaming",
    },
    {
      name: "Tablets",
      slug: "tablets",
      image_url:
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:300:300/q:90/plain/https://cellphones.com.vn/media/catalog/product/i/p/ipad-pro-m5.jpg",
      description: "Tablets and iPads for productivity",
    },
    {
      name: "Headphones",
      slug: "headphones",
      image_url:
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:300:300/q:90/plain/https://cellphones.com.vn/media/catalog/product/g/r/group_111_1_1.png",
      description: "Wireless and wired headphones",
    },
    {
      name: "Smartwatches",
      slug: "smartwatches",
      image_url:
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:300:300/q:90/plain/https://cellphones.com.vn/media/catalog/product/a/p/apple_lte_3_21.png",
      description: "Smartwatches and fitness trackers",
    },
    {
      name: "Cameras",
      slug: "cameras",
      image_url:
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:358:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/c/a/camera-imou-ipc-a32e-khong-day-3mp_2.png",
      description: "Digital cameras and accessories",
    },
    {
      name: "Gaming",
      slug: "gaming",
      image_url:
        "https://product.hstatic.net/200000722513/product/may-choi-game-msi-claw-a1m-049vn_9e71b95c111446598e8ff8090302a175_39f190f469d248d585024b6203d40112_grande.png",
      description: "Gaming consoles and accessories",
    },
    {
      name: "Accessories",
      slug: "accessories",
      image_url:
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:358:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/d/a/dan-cuong-luc-iphone-15-jcpal-8_1.png",
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
      image_url: "https://picsum.photos/seed/android/600/400",
      description: "Android smartphones",
      category_id: categories[0].id,
    },
    {
      name: "iOS",
      image_url: "https://picsum.photos/seed/ios/600/400",
      description: "Apple iPhones",
      category_id: categories[0].id,
    },
    {
      name: "Ultrabook",
      image_url: "https://picsum.photos/seed/ultrabook/600/400",
      description: "Thin and light laptops",
      category_id: categories[1].id,
    },
    {
      name: "Gaming Laptop",
      image_url: "https://picsum.photos/seed/gaming-laptop/600/400",
      description: "High-performance gaming laptops",
      category_id: categories[1].id,
    },
    {
      name: "iPad",
      image_url: "https://picsum.photos/seed/ipad/600/400",
      description: "Apple iPads",
      category_id: categories[2].id,
    },
    {
      name: "Android Tablet",
      image_url: "https://picsum.photos/seed/android-tablet/600/400",
      description: "Android tablets",
      category_id: categories[2].id,
    },
    {
      name: "Wireless",
      image_url: "https://picsum.photos/seed/wireless/600/400",
      description: "Wireless headphones",
      category_id: categories[3].id,
    },
    {
      name: "Wired",
      image_url: "https://picsum.photos/seed/wired/600/400",
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
  // Tạo map để dễ dàng truy cập filterKey theo key
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
  const products = [
    {
      name: "Galaxy S24 Ultra",
      price: 1199.99,
      discount: 100.0,
      quantity: 50, // Tổng số lượng
      sold: 15,
      rating: 4.8,
      img: [
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/s/a/samsung-galaxy-s24-ultra_1_.png",
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/s/s/ss-s24-ultra-den-600.png",
      ],
      specs: [
        { label: "Brand", value: "Samsung" },
        { label: "RAM", value: "12GB" },
        { label: "Processor", value: "Snapdragon 8 Gen 3" },
        { label: "Storage", value: "256GB" },
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
            { label: "Storage", value: "256GB" },
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
      color: JSON.stringify([
        { name: "Black", code: "#000000" },
        { name: "Blue", code: "#1e90ff" },
        { name: "Silver", code: "#c0c0c0" },
      ]),
      description:
        "Flagship smartphone with S Pen, Titanium frame, and AI features",
      category_id: categories[0].id,
      sub_category_id: subCategories[0].id,
    },
    {
      name: "iPhone 15 Pro Max",
      price: 1299.99,
      discount: 150.0,
      quantity: 40,
      sold: 12,
      rating: 4.9,
      img: [
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/i/p/iphone-15-plus_1__1.png",
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/v/n/vn1b93_1_2.jpg",
      ],
      specs: [
        { label: "Brand", value: "Apple" },
        { label: "RAM", value: "8GB" },
        { label: "Processor", value: "A17 Pro" },
        { label: "Storage", value: "256GB" },
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
        {
          category: "Battery",
          items: [
            { label: "Battery", value: "4441mAh" },
            { label: "Charging", value: "USB-C" },
          ],
        },
      ],
      color: JSON.stringify([
        { name: "Titanium", code: "#878681" },
        { name: "Blue Titanium", code: "#4169e1" },
      ]),
      description:
        "Apple's flagship iPhone with titanium design and A17 Pro chip",
      category_id: categories[0].id,
      sub_category_id: subCategories[1].id,
    },
    {
      name: "MacBook Pro 16",
      price: 2499.99,
      discount: 200.0,
      quantity: 25,
      sold: 8,
      rating: 4.7,
      img: [
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/t/e/text_ng_n_2__11.png",
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/t/e/text_ng_n_3__9.png",
      ],
      specs: [
        { label: "Brand", value: "Apple" },
        { label: "RAM", value: "32GB" },
        { label: "Processor", value: "M3 Max" },
        { label: "Storage", value: "1TB SSD" },
        { label: "GPU Brand", value: "Apple" },
      ],
      specs_detail: [
        { label: "Screen Size", value: "16.2 inch" },
        { label: "Weight", value: "2.15kg" },
      ],
      color: JSON.stringify([{ name: "Space Gray", code: "#4d4d4d" }]),
      description:
        "Professional laptop with M3 Max chip for extreme performance",
      category_id: categories[1].id,
      sub_category_id: subCategories[2].id,
    },
    {
      name: "ASUS ROG Strix G16",
      price: 1899.99,
      discount: 150.0,
      quantity: 30,
      sold: 5,
      rating: 4.6,
      img: [
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/t/e/text_ng_n_2__10_36.png",
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/t/e/text_ng_n_4__8_29.png",
      ],
      specs: [
        { label: "Brand", value: "ASUS" },
        { label: "RAM", value: "16GB" },
        { label: "Processor", value: "Intel i7-13700H" },
        { label: "Storage", value: "512GB SSD" },
        { label: "GPU Brand", value: "NVIDIA" },
      ],
      specs_detail: [
        { label: "Screen Size", value: "16 inch" },
        { label: "GPU", value: "RTX 4060" },
      ],
      color: JSON.stringify([{ name: "Black", code: "#000000" }]),
      description: "Gaming laptop with Intel Core i7 and NVIDIA RTX 4060",
      category_id: categories[1].id,
      sub_category_id: subCategories[3].id,
    },
    {
      name: "iPad Pro 12.9",
      price: 1099.99,
      discount: 100.0,
      quantity: 35,
      sold: 10,
      rating: 4.8,
      img: [
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/i/p/ipad_pro_12.9_2020_wifi_256gb__2.png",
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/a/p/apple-ipad-pro-12-9-2020-wifi-128-gb-6.jpg",
      ],
      specs: [
        { label: "Brand", value: "Apple" },
        { label: "RAM", value: "8GB" },
        { label: "Processor", value: "M2" },
        { label: "Storage", value: "256GB" },
      ],
      specs_detail: [
        { label: "Screen Size", value: "12.9 inch" },
        { label: "Battery", value: "40.88 Wh" },
      ],
      color: JSON.stringify([
        { name: "Silver", code: "#c0c0c0" },
        { name: "Space Gray", code: "#4d4d4d" },
      ]),
      description:
        "Professional tablet with M2 chip and Liquid Retina XDR display",
      category_id: categories[2].id,
      sub_category_id: subCategories[4].id,
    },
    {
      name: "Samsung Galaxy Tab S9",
      price: 799.99,
      discount: 50.0,
      quantity: 28,
      sold: 7,
      rating: 4.5,
      img: [
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/s/a/samsung-galaxy-tab-s9-xam-12_1.jpg",
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/s/a/samsung-galaxy-tab-s9-fe-mint-13_1.jpg",
      ],
      specs: [
        { label: "Brand", value: "Samsung" },
        { label: "RAM", value: "8GB" },
        { label: "Processor", value: "Snapdragon 8 Gen 2" },
        { label: "Storage", value: "128GB" },
      ],
      specs_detail: [
        { label: "Screen Size", value: "11 inch" },
        { label: "Battery", value: "8400mAh" },
      ],
      color: JSON.stringify([
        { name: "Black", code: "#000000" },
        { name: "Beige", code: "#f5f5dc" },
      ]),
      description: "Premium Android tablet with S Pen included",
      category_id: categories[2].id,
      sub_category_id: subCategories[5].id,
    },
    {
      name: "Sony WH-1000XM5",
      price: 399.99,
      discount: 50.0,
      quantity: 45,
      sold: 20,
      rating: 4.9,
      img: [
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/t/a/tai-nghe-chup-tai-sony-wh-1000xm5-2.png",
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/t/a/tai-nghe-chup-tai-sony-wh-1000xm5-2-removebg-preview.png",
      ],
      specs: [
        { label: "Brand", value: "Sony" },
        { label: "Type", value: "Wireless" },
      ],
      specs_detail: [
        { label: "Battery", value: "30 hours" },
        { label: "Noise Canceling", value: "Yes" },
      ],
      color: JSON.stringify([
        { name: "Black", code: "#000000" },
        { name: "Silver", code: "#c0c0c0" },
      ]),
      description:
        "Premium noise-canceling headphones with industry-leading sound",
      category_id: categories[3].id,
      sub_category_id: subCategories[6].id,
    },
    {
      name: "AirPods Pro 2",
      price: 249.99,
      discount: 25.0,
      quantity: 60,
      sold: 30,
      rating: 4.8,
      img: [
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/1/_/1_264.jpg",
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/4/_/4_197.jpg",
      ],
      specs: [
        { label: "Brand", value: "Apple" },
        { label: "Type", value: "Wireless" },
      ],
      specs_detail: [
        { label: "Battery", value: "6 hours" },
        { label: "Noise Canceling", value: "Yes" },
      ],
      color: JSON.stringify([{ name: "White", code: "#ffffff" }]),
      description:
        "Wireless earbuds with active noise cancellation and Transparency mode",
      category_id: categories[3].id,
      sub_category_id: subCategories[6].id,
    },
    {
      name: "Apple Watch Series 9",
      price: 399.99,
      discount: 40.0,
      quantity: 40,
      sold: 15,
      rating: 4.7,
      img: [
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/a/p/apple-watch-series-9-45mm-_10_.png",
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/a/p/apple-watch-series-9-45mm-.png",
      ],
      specs: [
        { label: "Brand", value: "Apple" },
        { label: "Size", value: "45mm" },
      ],
      specs_detail: [
        { label: "Battery", value: "18 hours" },
        { label: "Water Resistance", value: "50m" },
      ],
      color: JSON.stringify([
        { name: "Midnight", code: "#191970" },
        { name: "Starlight", code: "#f5f5dc" },
        { name: "Product Red", code: "#ff0000" },
      ]),
      description: "Smartwatch with S9 chip and Double Tap gesture",
      category_id: categories[4].id,
      sub_category_id: null,
    },
    {
      name: "Canon EOS R5",
      price: 3899.99,
      discount: 300.0,
      quantity: 15,
      sold: 3,
      rating: 4.9,
      img: [
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/m/a/may-anh-canon-eos-r50_4_.png",
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/m/a/may-anh-canon-eos-r50_1_.png",
      ],
      specs: [
        { label: "Brand", value: "Canon" },
        { label: "Sensor", value: "45MP" },
      ],
      specs_detail: [
        { label: "Video", value: "8K" },
        { label: "ISO", value: "100-51200" },
      ],
      color: JSON.stringify([{ name: "Black", code: "#000000" }]),
      description: "Full-frame mirrorless camera with 8K video recording",
      category_id: categories[5].id,
      sub_category_id: null,
    },
    {
      name: "PlayStation 5",
      price: 499.99,
      discount: 0.0,
      quantity: 20,
      sold: 50,
      rating: 4.8,
      img: [
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/m/a/may-choi-game-sony-playstation-5-slim-1.png",
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/m/a/may-choi-game-sony-playstation-5-slim-3.png",
      ],
      specs: [
        { label: "Brand", value: "Sony" },
        { label: "Storage", value: "825GB SSD" },
      ],
      specs_detail: [
        { label: "GPU", value: "AMD RDNA 2" },
        { label: "RAM", value: "16GB GDDR6" },
      ],
      color: JSON.stringify([{ name: "White", code: "#ffffff" }]),
      description: "Next-gen gaming console with ultra-high-speed SSD",
      category_id: categories[6].id,
      sub_category_id: null,
    },
    {
      name: "Xbox Series X",
      price: 499.99,
      discount: 0.0,
      quantity: 18,
      sold: 45,
      rating: 4.7,
      img: [
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/t/a/tay-cam-choi-game-microsoft-xbox-series-x-controller-1.png",
        "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/t/a/tay-cam-choi-game-1_1.png",
      ],
      specs: [
        { label: "Brand", value: "Microsoft" },
        { label: "Storage", value: "1TB SSD" },
      ],
      specs_detail: [
        { label: "GPU", value: "AMD RDNA 2" },
        { label: "RAM", value: "16GB GDDR6" },
      ],
      color: JSON.stringify([{ name: "Black", code: "#000000" }]),
      description: "Most powerful Xbox with 12 teraflops of processing power",
      category_id: categories[6].id,
      sub_category_id: null,
    },
  ];

  // Create products
  const createdProducts = [];
  for (const product of products) {
    const created = await prisma.product.create({
      data: {
        name: product.name,
        price: product.price,
        discount: product.discount,
        quantity: product.quantity,
        sold: product.sold,
        rating: product.rating,
        img: product.img,
        specs: product.specs,
        specs_detail: product.specs_detail,
        color: product.color,
        description: product.description,
        category_id: product.category_id,
        sub_category_id: product.sub_category_id,
        // Create product colors with quantities
        product_colors: {
          create: parseColorsWithQuantities(product.color, product.quantity),
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
  const comments = [
    "Excellent product! Highly recommended.",
    "Very good value for money.",
    "Decent, but could be better.",
    "Amazing quality and fast shipping!",
    "Great product, exceeded my expectations.",
    "Good product but delivery was slow.",
    "Perfect for my needs, very satisfied!",
    "Not bad, but there are better options.",
    "Outstanding quality and performance!",
    "Good value, would buy again.",
    "Fast delivery and good packaging.",
    "Product arrived in perfect condition.",
    "Better than expected!",
    "Good customer service experience.",
    "Will definitely purchase again.",
  ];

  for (let i = 0; i < 25; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const product = products[Math.floor(Math.random() * products.length)];
    const rating = Math.floor(Math.random() * 2) + 4; // 4 or 5

    const review = await prisma.review.create({
      data: {
        user_id: user.id,
        product_id: product.id,
        rating: rating,
        comment: comments[i % comments.length],
      },
    });

    reviews.push(review);
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
      description: "Mã ngân hàng cho QR code chuyển khoản",
      category: "bank",
      data_type: "string",
      is_public: false,
    },
    {
      key: "bank_account_no",
      value: process.env.BANK_ACCOUNT_NO || "1234567890",
      description: "Số tài khoản ngân hàng",
      category: "bank",
      data_type: "string",
      is_public: false,
    },
    {
      key: "bank_account_name",
      value: process.env.BANK_ACCOUNT_NAME || "Tech Shop",
      description: "Tên chủ tài khoản ngân hàng",
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
      value: process.env.SHIPPING_FEE || "22000",
      description: "Phí vận chuyển mặc định (VND)",
      category: "shipping",
      data_type: "number",
      is_public: true,
    },
    {
      key: "free_shipping_threshold",
      value: process.env.FREE_SHIPPING_THRESHOLD || "500000",
      description: "Ngưỡng miễn phí vận chuyển (VND)",
      category: "shipping",
      data_type: "number",
      is_public: true,
    },
    {
      key: "store_name",
      value: process.env.STORE_NAME || "Tech Shop",
      description: "Tên cửa hàng",
      category: "general",
      data_type: "string",
      is_public: true,
    },
    {
      key: "store_email",
      value: process.env.STORE_EMAIL || "contact@techshop.com",
      description: "Email liên hệ cửa hàng",
      category: "general",
      data_type: "string",
      is_public: true,
    },
    {
      key: "store_phone",
      value: process.env.STORE_PHONE || "0123456789",
      description: "Số điện thoại liên hệ cửa hàng",
      category: "general",
      data_type: "string",
      is_public: true,
    },
    {
      key: "store_address",
      value: process.env.STORE_ADDRESS || "123 Main Street, Ho Chi Minh City",
      description: "Địa chỉ cửa hàng",
      category: "general",
      data_type: "string",
      is_public: true,
    },
    {
      key: "currency",
      value: "USD",
      description: "Đơn vị tiền tệ",
      category: "general",
      data_type: "string",
      is_public: true,
    },
    {
      key: "enable_momo",
      value: "true",
      description: "Bật thanh toán MoMo",
      category: "payment",
      data_type: "boolean",
      is_public: true,
    },
    {
      key: "momo_partner_code",
      value: process.env.MOMO_PARTNER_CODE || "MOMO",
      description: "Mã đối tác MoMo",
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
