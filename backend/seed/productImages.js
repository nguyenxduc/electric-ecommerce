/**
 * Product images for seed data.
 * Priority: CellphoneS / official brand CDN → Amazon (m.media-amazon.com) → Best Buy.
 * Frontend should use referrerPolicy="no-referrer" (see ProductImage.tsx).
 */

/** CellphoneS image proxy — paths from cellphones.com.vn/media/catalog/product/ */
export const cps = (path) =>
  `https://cdn2.cellphones.com.vn/insecure/rs:fill:0:960/q:90/plain/https://cellphones.com.vn/media/catalog/product/${path}`;

const appleStore = (slug, opts = "wid=1200&hei=1200&fmt=jpeg&qlt=85") =>
  `https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/${slug}?${opts}`;

const applePhone = (slug, version) => {
  const base = `https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/${slug}?wid=940&hei=1112&fmt=png-alpha&qlt=80`;
  return version ? `${base}&.v=${version}` : base;
};

const logitech = (file) =>
  `https://resource.logitech.com/w_900,c_lpad,ar_1:1,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/logitech/en/products/mice/mx-master-3s/gallery/${file}`;

/** Samsung DAM — avoid raw `$` in URLs (breaks some HTTP clients). */
const samsungGallery = (id) =>
  `https://images.samsung.com/is/image/samsung/p6pim/uk/2407/gallery/uk-galaxy-buds3-pro-r630-sm-r630nzaaeua-${id}`;

const bestBuy = (sku, variant = "sd") => {
  const folder = sku.slice(0, 4);
  const file = variant === "sd" ? `${sku}_sd.jpg` : `${sku}${variant}.jpg`;
  return `https://pisces.bbystatic.com/image2/BestBuy_US/images/products/${folder}/${file}`;
};

/** Samsung UK — official Tab S9 buy-page assets */
const samsungUkTab = (path) =>
  `https://images.samsung.com/uk/galaxy-tab-s9/buy/${path}`;

/** Xiaomi Global product page (mi.com) */
const miImage = (file) =>
  `https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-14/PC/${file}`;

/** Nintendo Cloudinary — OLED model gallery */
const nintendoOled = (path) =>
  `https://assets.nintendo.com/image/upload/f_auto/q_auto/dpr_2.0/${path}`;

/**
 * Amazon product gallery (m.media-amazon.com).
 * imageId from listing hiRes — e.g. Dell B0CLHY1KHR, Canon B08C68F2DX.
 */
const amazonImg = (imageId, size = "SL1500") =>
  `https://m.media-amazon.com/images/I/${imageId}._AC_${size}_.jpg`;

/**
 * @type {Record<string, string[]>}
 * Keys must match product names in productsCatalog.js exactly.
 */
export const SEED_PRODUCT_IMAGES = {
  // --- Smartphones (CellphoneS + Apple / Samsung official) ---
  "Galaxy S24 Ultra": [
    cps("s/a/samsung-galaxy-s24-ultra_1_.png"),
    cps("s/a/samsung-galaxy-s24-ultra.png"),
    cps("s/s/ss-s24-ultra-den-600.png"),
  ],
  "iPhone 15 Pro Max": [
    cps("i/p/iphone-15-pro-max_1_.png"),
    cps("i/p/iphone-15-pro-max.png"),
    applePhone(
      "iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium",
      "1693009279826"
    ),
  ],
  "Google Pixel 8 Pro": [
    cps("g/o/google-pixel-8-pro_7_.png"),
    cps("g/o/google-pixel-8-pro_5_.png"),
    cps("g/o/google-pixel-8-pro.png"),
  ],
  "Xiaomi 14": [
    miImage("headAss2_img.jpeg"),
    miImage("headAss_img.jpeg"),
    miImage("exponentially_img.jpeg"),
  ],

  // --- Laptops ---
  "MacBook Pro 16": [
    cps("t/e/text_ng_n_2__11.png"),
    bestBuy("6534635"),
    bestBuy("6534635", "cv12d"),
  ],
  "Dell XPS 15": [
    amazonImg("61S-0yGGx0L"),
    amazonImg("71-Zk01w4uL"),
    amazonImg("61ixp2BJXAL"),
  ],
  "ASUS ROG Strix G16": [
    cps("t/e/text_ng_n_2__10_36.png"),
    bestBuy("6572156"),
    bestBuy("6572156", "cv3d"),
  ],

  // --- Tablets ---
  "iPad Pro 12.9": [
    cps("i/p/ipad_pro_12.9_2020_wifi_256gb__2.png"),
    bestBuy("6447382"),
    bestBuy("6447382", "cv12d"),
  ],
  "Samsung Galaxy Tab S9": [
    samsungUkTab(
      "02-Carousel/Basic/01-Series_KV/TabS9_Series-KV_PC.jpg?imbypass=true"
    ),
    samsungUkTab(
      "03-Color/Color-Selection/03_Tab-S9/TabS9-Graphite_Color-Selection_MO.jpg"
    ),
    samsungUkTab("07-WITB/03_Tab-S9/TabS9-Graphite_WIB-Universal_PC.png"),
  ],

  // --- Audio ---
  "Sony WH-1000XM5": [
    cps("t/a/tai-nghe-chup-tai-sony-wh-1000xm5-2.png"),
    cps("t/a/tai-nghe-chup-tai-sony-wh-1000xm5-2-removebg-preview.png"),
    bestBuy("6505727"),
  ],
  "AirPods Pro 2": [
    appleStore("MQD83"),
    appleStore("MQD83_AV1"),
    cps("1/_/1_264.jpg"),
  ],
  "Samsung Galaxy Buds3 Pro": [
    samsungGallery("542217308"),
    bestBuy("6585614"),
    bestBuy("6585614", "cv12d"),
  ],

  // --- Wearables ---
  "Apple Watch Series 9": [
    cps("a/p/apple-watch-series-9-45mm-_10_.png"),
    cps("a/p/apple-watch-series-9-45mm-.png"),
    bestBuy("6537049"),
  ],
  "Garmin Fenix 7": [
    cps("d/o/dong-ho-thong-minh-garmin-fenix-7_1_.png"),
    cps("d/o/dong-ho-thong-minh-garmin-fenix-7_2_.png"),
    cps("d/o/dong-ho-thong-minh-garmin-fenix-7_3_.png"),
  ],

  // --- Camera ---
  "Canon EOS R5": [
    amazonImg("71hpUUcC5uL"),
    amazonImg("71kHYhqWyHL"),
    amazonImg("71-zKY-dTXL"),
  ],

  // --- Gaming (CellphoneS + verified console SKUs) ---
  "PlayStation 5": [
    cps("m/a/may-choi-game-sony-playstation-5-slim-3.png"),
    cps("m/a/may-choi-game-sony-playstation-5-slim-1.png"),
    bestBuy("6535331"),
    bestBuy("6535331", "cv11d"),
  ],
  "Xbox Series X": [
    bestBuy("6428324"),
    bestBuy("6428324", "cv13d"),
    bestBuy("6428324", "cv11d"),
  ],
  "Nintendo Switch OLED": [
    nintendoOled(
      "ncom/en_US/products/hardware/nintendo-switch-oled-model-white-set/115461-switch-oled-white-boxart-1200x675"
    ),
    nintendoOled("ncom/en_US/switch/site-design-update/oled-model-photo-01"),
    nintendoOled("ncom/en_US/switch/lifestyle/oled-model/oled_gallery_02"),
  ],

  // --- Accessories ---
  "MagSafe Charger 15W": [
    appleStore("MHXH3", "wid=2000&hei=2000&fmt=jpeg&qlt=85"),
    appleStore("MHXH3_AV1", "wid=2000&hei=2000&fmt=jpeg&qlt=85"),
    appleStore("MHXH3_AV2", "wid=2000&hei=2000&fmt=jpeg&qlt=85"),
  ],
  "Logitech MX Master 3S": [
    cps("c/h/chuot-khong-day-logitech-mx-master-3s.png"),
    logitech("mx-master-3s-mouse-top-view-graphite.png"),
    logitech("mx-master-3s-mouse-side-view-graphite.png"),
  ],
};

/** Category / subcategory thumbnails (first product image per category). */
export const CATEGORY_IMAGE_URLS = {
  smartphones: cps("s/a/samsung-galaxy-s24-ultra_1_.png"),
  laptops: bestBuy("6534635"),
  tablets: samsungUkTab(
    "02-Carousel/Basic/01-Series_KV/TabS9_Series-KV_PC.jpg?imbypass=true"
  ),
  headphones: cps("t/a/tai-nghe-chup-tai-sony-wh-1000xm5-2.png"),
  smartwatches: cps("a/p/apple-watch-series-9-45mm-_10_.png"),
  cameras: amazonImg("71hpUUcC5uL"),
  gaming: cps("m/a/may-choi-game-sony-playstation-5-slim-3.png"),
  accessories: appleStore("MHXH3", "wid=800&hei=800&fmt=jpeg&qlt=85"),
};
