/**
 * Rich markdown descriptions + grouped technical specs for seed products.
 * Images are injected from SEED_PRODUCT_IMAGES at enrich time.
 */

export function buildMarkdownDescription({
  title,
  intro,
  sections = [],
  highlights = [],
  images = [],
  footer,
}) {
  const parts = [`## ${title}`, "", intro, ""];

  if (images[0]) {
    parts.push(`![${title}](${images[0]})`, "");
  }

  for (const section of sections) {
    parts.push(`### ${section.title}`, "");
    for (const paragraph of section.paragraphs) {
      parts.push(paragraph, "");
    }
    if (section.image) {
      parts.push(`![${section.title}](${section.image})`, "");
    }
  }

  if (highlights.length) {
    parts.push("### Key highlights", "");
    for (const item of highlights) {
      parts.push(`- ${item}`);
    }
    parts.push("");
  }

  if (footer) {
    parts.push("---", "", footer);
  }

  return parts.join("\n").trim();
}

const specGroup = (category, items) => ({ category, items });

const PRODUCT_INTROS = {
  "Galaxy S24 Ultra":
    "Samsung's 2024 ultra flagship — S Pen, titanium frame, 200MP camera, and Galaxy AI for everyday productivity.",
  "iPhone 15 Pro Max":
    "Apple's pro iPhone with titanium design, A17 Pro chip, 5x telephoto, and USB-C for creators and power users.",
  "Google Pixel 8 Pro":
    "Google's AI-first flagship with Tensor G3, pure Android, and seven years of software support.",
  "Xiaomi 14":
    "Compact Leica-tuned flagship with Snapdragon 8 Gen 3 and 90W charging in a pocket-friendly size.",
  "MacBook Pro 16":
    "16-inch pro laptop with M3 Max for video, code, and 3D — Liquid Retina XDR and all-day battery.",
  "Dell XPS 15":
    "Premium 15-inch ultrabook with OLED option, RTX graphics, and a precision build for creators.",
  "ASUS ROG Strix G16":
    "High-refresh gaming laptop with RTX 4060, Intel Core i7, and ROG cooling for esports and AAA.",
  "iPad Pro 12.9":
    "Pro tablet with M2, XDR display, and Thunderbolt for artists, students, and mobile editors.",
  "Samsung Galaxy Tab S9":
    "Premium Android tablet with included S Pen, DeX desktop mode, and IP68 durability.",
  "Sony WH-1000XM5":
    "Sony's flagship over-ear headphones with class-leading ANC and 30-hour battery.",
  "AirPods Pro 2":
    "Apple's in-ear pros with H2 chip, Adaptive Audio, and Personalized Spatial Audio.",
  "Samsung Galaxy Buds3 Pro":
    "Samsung's blade-style true wireless earbuds with ANC and Galaxy AI features.",
  "Apple Watch Series 9":
    "Advanced health and fitness watch with S9 chip, Double Tap, and bright Always-On display.",
  "Garmin Fenix 7":
    "Rugged multisport GPS watch with topo maps and multi-week battery in the wild.",
  "Canon EOS R5":
    "45MP hybrid mirrorless for 8K video and pro stills with Dual Pixel AF II.",
  "PlayStation 5":
    "Sony's next-gen console with ultra-fast SSD, ray tracing, and DualSense immersion.",
  "Xbox Series X":
    "Microsoft's most powerful Xbox with 12 TF GPU, Quick Resume, and 4K 120fps support.",
  "Nintendo Switch OLED":
    "Hybrid console with a vivid 7-inch OLED screen for handheld and TV play.",
  "MagSafe Charger 15W":
    "Apple MagSafe puck for fast, aligned wireless charging on iPhone and AirPods.",
  "Logitech MX Master 3S":
    "Ergonomic productivity mouse with quiet clicks, MagSpeed scroll, and glass tracking.",
};

const PRODUCT_CONTENT = {
  "Galaxy S24 Ultra": {
    sections: [
      {
        title: "Display & design",
        paragraphs: [
          "The 6.8-inch Dynamic AMOLED 2X panel delivers up to 2,600 nits peak brightness, 120Hz adaptive refresh, and Gorilla Glass Armor for fewer reflections outdoors.",
          "A titanium frame and IP68 rating make this one of the most durable Galaxy phones for travel and daily carry.",
        ],
      },
      {
        title: "Camera & Galaxy AI",
        paragraphs: [
          "The 200MP main sensor pairs with 12MP ultra-wide and dual telephoto cameras (3x and 5x optical). Nightography and Generative Edit help rescue tough shots after the fact.",
          "Galaxy AI adds live call translation, note summaries, and on-device photo suggestions without sending data to the cloud when configured for on-device processing.",
        ],
      },
      {
        title: "Performance & battery",
        paragraphs: [
          "Snapdragon 8 Gen 3 for Galaxy keeps gaming, multitasking, and DeX desktop workflows responsive. The built-in S Pen supports notes, sketches, and precise UI control.",
          "A 5,000 mAh battery supports 45W wired and 15W wireless charging — enough for heavy days with the always-on display enabled.",
        ],
      },
    ],
    highlights: [
      "Built-in S Pen with low latency",
      "200MP camera with 5x optical zoom",
      "Galaxy AI translation and photo tools",
      "IP68 + titanium frame",
    ],
    specs_detail: [
      specGroup("Display", [
        { label: "Screen", value: "6.8\" Dynamic AMOLED 2X" },
        { label: "Resolution", value: "3120 × 1440 (QHD+)" },
        { label: "Refresh rate", value: "1–120Hz adaptive" },
        { label: "Peak brightness", value: "Up to 2600 nits" },
      ]),
      specGroup("Performance", [
        { label: "Chipset", value: "Snapdragon 8 Gen 3 for Galaxy" },
        { label: "RAM", value: "12GB" },
        { label: "Storage", value: "256GB UFS 4.0" },
        { label: "S Pen", value: "Included, Bluetooth enabled" },
      ]),
      specGroup("Camera", [
        { label: "Main", value: "200MP wide, OIS" },
        { label: "Ultra wide", value: "12MP" },
        { label: "Telephoto", value: "10MP 3x + 50MP 5x" },
        { label: "Front", value: "12MP" },
      ]),
      specGroup("Battery & connectivity", [
        { label: "Battery", value: "5000 mAh" },
        { label: "Charging", value: "45W wired / 15W wireless" },
        { label: "5G", value: "Sub-6 + mmWave (market dependent)" },
        { label: "Durability", value: "IP68" },
      ]),
    ],
  },

  "iPhone 15 Pro Max": {
    sections: [
      {
        title: "Design & display",
        paragraphs: [
          "Forged titanium bands reduce weight while keeping a premium feel. The Action button replaces the mute switch and can launch shortcuts, camera modes, or accessibility tools.",
          "The 6.7-inch Super Retina XDR display uses ProMotion (1–120Hz), Ceramic Shield front glass, and excellent color accuracy for photo and video review on the go.",
        ],
      },
      {
        title: "A17 Pro & camera system",
        paragraphs: [
          "A17 Pro is built on 3nm technology with a 6-core GPU suited for console-quality games and hardware-accelerated ray tracing.",
          "The 48MP main camera captures 24MP default shots, 5x tetraprism telephoto (Pro Max), and ProRes/Log video for professional workflows over USB-C.",
        ],
      },
      {
        title: "Battery & ecosystem",
        paragraphs: [
          "USB-C enables faster data transfer to Mac and external drives. MagSafe and Qi2 wireless charging complement all-day battery life with efficient iOS power management.",
          "Works seamlessly with Apple Watch, AirPods, Mac, and iPad — Handoff, AirDrop, and iCloud tie the experience together.",
        ],
      },
    ],
    highlights: [
      "A17 Pro with hardware ray tracing",
      "5x optical telephoto (Pro Max)",
      "Titanium design + Action button",
      "USB-C with ProRes video",
    ],
    specs_detail: [
      specGroup("Display", [
        { label: "Screen", value: "6.7\" Super Retina XDR" },
        { label: "Technology", value: "OLED, ProMotion 120Hz" },
        { label: "Resolution", value: "2796 × 1290" },
        { label: "Protection", value: "Ceramic Shield" },
      ]),
      specGroup("Performance", [
        { label: "Chip", value: "A17 Pro" },
        { label: "RAM", value: "8GB" },
        { label: "Storage", value: "256GB NVMe" },
        { label: "Port", value: "USB-C 3 (10Gb/s)" },
      ]),
      specGroup("Camera", [
        { label: "Main", value: "48MP, sensor-shift OIS" },
        { label: "Ultra wide", value: "12MP" },
        { label: "Telephoto", value: "12MP 5x optical" },
        { label: "Video", value: "4K ProRes, Log recording" },
      ]),
      specGroup("Battery", [
        { label: "Video playback", value: "Up to 33 hours" },
        { label: "Wired charging", value: "USB-C fast charge" },
        { label: "Wireless", value: "MagSafe up to 15W" },
        { label: "Water resistance", value: "IP68" },
      ]),
    ],
  },

  "Google Pixel 8 Pro": {
    sections: [
      {
        title: "Pure Android & AI",
        paragraphs: [
          "Pixel 8 Pro ships with the cleanest Google Android experience — seven years of OS and security updates are among the best in the industry.",
          "Tensor G3 accelerates Magic Eraser, Best Take, Audio Magic Eraser, and on-device Gemini features for photos, calls, and messaging.",
        ],
      },
      {
        title: "Display & cameras",
        paragraphs: [
          "The 6.7-inch LTPO OLED runs at 1–120Hz with 2,400 nits peak HDR brightness for readable outdoor use.",
          "A 50MP main, 48MP ultra-wide, and 48MP periscope telephoto deliver consistent color science and excellent computational night shots.",
        ],
      },
    ],
    highlights: [
      "7 years of OS + security updates",
      "Tensor G3 on-device AI",
      "50MP main + 5x periscope telephoto",
      "Temperature sensor (region dependent)",
    ],
    specs_detail: [
      specGroup("Display", [
        { label: "Screen", value: "6.7\" LTPO OLED" },
        { label: "Refresh rate", value: "1–120Hz" },
        { label: "Peak brightness", value: "2400 nits HDR" },
      ]),
      specGroup("Performance", [
        { label: "Chipset", value: "Google Tensor G3" },
        { label: "RAM", value: "12GB" },
        { label: "Storage", value: "128GB" },
      ]),
      specGroup("Camera", [
        { label: "Main", value: "50MP wide, OIS" },
        { label: "Ultra wide", value: "48MP" },
        { label: "Telephoto", value: "48MP 5x" },
        { label: "Front", value: "10.5MP" },
      ]),
    ],
  },

  "Xiaomi 14": {
    sections: [
      {
        title: "Compact flagship",
        paragraphs: [
          "Xiaomi 14 packs Snapdragon 8 Gen 3 into a 6.36-inch body — ideal if you want flagship speed without a phablet footprint.",
          "Leica Summilux optics tune color and contrast for natural portraits and street photography.",
        ],
      },
      {
        title: "Charging & display",
        paragraphs: [
          "90W HyperCharge wired and 50W wireless charging top up the battery quickly. The 1.5K 120Hz AMOLED panel is bright and responsive for gaming.",
          "HyperOS delivers smooth animations and deep customization while staying close to stock Android ergonomics.",
        ],
      },
    ],
    highlights: [
      "Leica-tuned triple camera",
      "90W wired fast charging",
      "Compact 6.36\" flagship",
      "Snapdragon 8 Gen 3",
    ],
    specs_detail: [
      specGroup("Display", [
        { label: "Screen", value: "6.36\" AMOLED" },
        { label: "Resolution", value: "2670 × 1200" },
        { label: "Refresh rate", value: "120Hz" },
      ]),
      specGroup("Performance", [
        { label: "Chipset", value: "Snapdragon 8 Gen 3" },
        { label: "RAM", value: "12GB" },
        { label: "Storage", value: "256GB" },
      ]),
      specGroup("Camera", [
        { label: "Main", value: "50MP Leica, OIS" },
        { label: "Telephoto", value: "50MP 3.2x" },
        { label: "Ultra wide", value: "50MP" },
      ]),
      specGroup("Battery", [
        { label: "Capacity", value: "4610 mAh" },
        { label: "Wired charge", value: "90W" },
        { label: "Wireless", value: "50W" },
      ]),
    ],
  },

  "MacBook Pro 16": {
    sections: [
      {
        title: "M3 Max performance",
        paragraphs: [
          "M3 Max with 14-core CPU and 30-core GPU handles 4K video timelines, 3D scenes, and local LLM experiments without desktop-class noise.",
          "32GB unified memory keeps dozens of browser tabs, IDE windows, and creative apps resident without swap thrashing.",
        ],
      },
      {
        title: "Display & I/O",
        paragraphs: [
          "The 16.2-inch Liquid Retina XDR mini-LED panel hits 1,600 nits HDR peaks — ideal for grading and HDR content review.",
          "Three Thunderbolt 4 ports, HDMI 2.1, SDXC, MagSafe 3, and a 1080p Center Stage camera cover pro workflows without dongle clutter.",
        ],
      },
    ],
    highlights: [
      "M3 Max — 14-core CPU / 30-core GPU",
      "16.2\" Liquid Retina XDR",
      "Up to 22-hour battery (Apple rating)",
      "MagSafe 3 + HDMI 2.1",
    ],
    specs_detail: [
      specGroup("Display", [
        { label: "Screen", value: "16.2\" Liquid Retina XDR" },
        { label: "Resolution", value: "3456 × 2234" },
        { label: "Peak brightness", value: "1600 nits HDR" },
      ]),
      specGroup("Performance", [
        { label: "Chip", value: "Apple M3 Max" },
        { label: "CPU", value: "14-core (10P + 4E)" },
        { label: "GPU", value: "30-core" },
        { label: "Memory", value: "32GB unified" },
        { label: "Storage", value: "1TB SSD" },
      ]),
      specGroup("Connectivity", [
        { label: "Thunderbolt", value: "3× Thunderbolt 4" },
        { label: "Video out", value: "HDMI 2.1" },
        { label: "Card slot", value: "SDXC UHS-II" },
        { label: "Wireless", value: "Wi-Fi 6E, Bluetooth 5.3" },
      ]),
    ],
  },

  "Dell XPS 15": {
    sections: [
      {
        title: "Premium ultrabook",
        paragraphs: [
          "XPS 15 pairs a CNC-machined aluminum chassis with a carbon-fiber palm rest for stiffness without excessive weight — a favorite among developers and creative pros.",
          "The 3.5K OLED touch option delivers deep blacks and 100% DCI-P3 coverage for color-critical photo and UI work.",
        ],
      },
      {
        title: "Performance",
        paragraphs: [
          "13th-gen Intel Core i7 and NVIDIA RTX 4050 handle Lightroom, Figma, and light CUDA workloads. Dual fans keep thermals in check during long compiles.",
          "16GB RAM and a 512GB NVMe SSD are upgrade-friendly on many configurations — check service manual for SO-DIMM access.",
        ],
      },
    ],
    highlights: [
      "15.6\" 3.5K OLED option",
      "RTX 4050 for creative GPU tasks",
      "Premium CNC aluminum build",
      "Large glass precision touchpad",
    ],
    specs_detail: [
      specGroup("Display", [
        { label: "Screen", value: "15.6\" OLED 3.5K (3456×2160)" },
        { label: "Touch", value: "Optional touch" },
        { label: "Color", value: "100% DCI-P3 (OLED config)" },
      ]),
      specGroup("Performance", [
        { label: "Processor", value: "Intel Core i7-13700H" },
        { label: "Graphics", value: "NVIDIA GeForce RTX 4050 6GB" },
        { label: "RAM", value: "16GB DDR5" },
        { label: "Storage", value: "512GB NVMe SSD" },
      ]),
      specGroup("Build", [
        { label: "Material", value: "Aluminum + carbon fiber" },
        { label: "Weight", value: "From ~1.86 kg (config dependent)" },
        { label: "OS", value: "Windows 11 Pro ready" },
      ]),
    ],
  },

  "ASUS ROG Strix G16": {
    sections: [
      {
        title: "Gaming-first hardware",
        paragraphs: [
          "ROG Strix G16 targets high-refresh esports and AAA titles with Intel Core i7-13700H and an RTX 4060 Laptop GPU with DLSS 3 frame generation.",
          "A 16-inch WQXGA 240Hz panel keeps motion clear in fast shooters; MUX Switch + NVIDIA Advanced Optimus balance dGPU power and battery life.",
        ],
      },
      {
        title: "Cooling & upgrade path",
        paragraphs: [
          "ROG Intelligent Cooling uses liquid metal on CPU and tri-fan exhaust to sustain boost clocks in long sessions.",
          "User-accessible RAM and dual M.2 slots make storage and memory upgrades straightforward.",
        ],
      },
    ],
    highlights: [
      "RTX 4060 Laptop + DLSS 3",
      "240Hz WQXGA display",
      "MUX Switch / Advanced Optimus",
      "Aura Sync RGB keyboard",
    ],
    specs_detail: [
      specGroup("Display", [
        { label: "Screen", value: "16\" WQXGA (2560×1600)" },
        { label: "Refresh rate", value: "240Hz" },
        { label: "Response", value: "3ms (typical)" },
      ]),
      specGroup("Performance", [
        { label: "CPU", value: "Intel Core i7-13700H" },
        { label: "GPU", value: "NVIDIA RTX 4060 Laptop 8GB" },
        { label: "RAM", value: "16GB DDR5" },
        { label: "Storage", value: "512GB PCIe 4.0 NVMe" },
      ]),
      specGroup("Features", [
        { label: "Keyboard", value: "Per-key RGB Aura Sync" },
        { label: "Wi-Fi", value: "Wi-Fi 6E" },
        { label: "Cooling", value: "ROG Intelligent Cooling" },
      ]),
    ],
  },

  "iPad Pro 12.9": {
    sections: [
      {
        title: "Pro tablet workflow",
        paragraphs: [
          "M2 delivers desktop-class performance for Procreate, LumaFusion, and Stage Manager multitasking with external display support.",
          "The 12.9-inch Liquid Retina XDR mini-LED display is ideal for HDR video review and high-contrast illustration.",
        ],
      },
    ],
    highlights: [
      "Apple M2 chip",
      "12.9\" Liquid Retina XDR",
      "Apple Pencil hover + ProRes",
      "Thunderbolt / USB-C port",
    ],
    specs_detail: [
      specGroup("Display", [
        { label: "Screen", value: "12.9\" Liquid Retina XDR" },
        { label: "Resolution", value: "2732 × 2048" },
        { label: "Refresh", value: "ProMotion 120Hz" },
      ]),
      specGroup("Performance", [
        { label: "Chip", value: "Apple M2" },
        { label: "RAM", value: "8GB" },
        { label: "Storage", value: "256GB" },
      ]),
    ],
  },

  "Samsung Galaxy Tab S9": {
    sections: [
      {
        title: "Android productivity",
        paragraphs: [
          "Tab S9 includes the S Pen in-box for notes, PDF markup, and precise editing in Samsung Notes and third-party apps.",
          "Snapdragon 8 Gen 2 drives DeX desktop mode — connect a monitor for a PC-like layout with keyboard and mouse.",
        ],
      },
    ],
    highlights: [
      "Included S Pen",
      "IP68 water resistance",
      "DeX desktop mode",
      "Snapdragon 8 Gen 2",
    ],
    specs_detail: [
      specGroup("Display", [
        { label: "Screen", value: "11\" Dynamic AMOLED 2X" },
        { label: "Refresh", value: "120Hz" },
      ]),
      specGroup("Performance", [
        { label: "Chipset", value: "Snapdragon 8 Gen 2" },
        { label: "RAM", value: "8GB" },
        { label: "Storage", value: "128GB" },
      ]),
      specGroup("Battery", [
        { label: "Capacity", value: "8400 mAh" },
        { label: "S Pen", value: "Included" },
      ]),
    ],
  },

  "Sony WH-1000XM5": {
    sections: [
      {
        title: "Sound & silence",
        paragraphs: [
          "Industry-leading noise canceling uses dual processors and eight microphones to adapt to flights, offices, and street noise in real time.",
          "30mm drivers tuned by Sony engineers deliver balanced detail — customizable EQ and spatial audio live in Sound Connect.",
        ],
      },
    ],
    highlights: [
      "Best-in-class ANC",
      "30-hour battery life",
      "Multipoint Bluetooth 5.2",
      "Speak-to-chat auto pause",
    ],
    specs_detail: [
      specGroup("Audio", [
        { label: "Driver", value: "30mm dynamic" },
        { label: "ANC", value: "Auto NC Optimizer" },
        { label: "Codecs", value: "LDAC, AAC, SBC" },
      ]),
      specGroup("Battery", [
        { label: "Playback", value: "Up to 30 hours (ANC on)" },
        { label: "Quick charge", value: "3 min = 3 hours playback" },
      ]),
      specGroup("Connectivity", [
        { label: "Bluetooth", value: "5.2 multipoint" },
        { label: "Weight", value: "Approx. 250 g" },
      ]),
    ],
  },

  "AirPods Pro 2": {
    sections: [
      {
        title: "Apple audio",
        paragraphs: [
          "H2 chip drives smarter ANC, Adaptive Audio, and Conversation Awareness that lowers volume when you start speaking.",
          "Personalized Spatial Audio with dynamic head tracking makes movies and games immersive on iPhone, iPad, and Mac.",
        ],
      },
    ],
    highlights: [
      "H2 chip + Adaptive Audio",
      "USB-C case with speaker",
      "Up to 2× ANC vs previous gen",
      "Find My precision finding",
    ],
    specs_detail: [
      specGroup("Audio", [
        { label: "Driver", value: "Custom high-excursion" },
        { label: "ANC", value: "Active + Transparency" },
        { label: "Spatial audio", value: "Personalized with head tracking" },
      ]),
      specGroup("Battery", [
        { label: "Earbuds", value: "Up to 6 hours listening" },
        { label: "With case", value: "Up to 30 hours total" },
      ]),
    ],
  },

  "Samsung Galaxy Buds3 Pro": {
    sections: [
      {
        title: "Galaxy audio",
        paragraphs: [
          "Blade-style stems with adaptive ANC and 360 Audio tuned for Galaxy phones — seamless pairing and Buds widget controls.",
          "Galaxy AI features include interpreter mode and hands-free commands when paired with recent Galaxy devices.",
        ],
      },
    ],
    highlights: [
      "Adaptive ANC",
      "IP57 dust/water resistance",
      "360 Audio on Galaxy",
      "Wireless charging case",
    ],
    specs_detail: [
      specGroup("Audio", [
        { label: "Drivers", value: "Dual 11mm + 6.5mm" },
        { label: "ANC", value: "Adaptive" },
        { label: "Codec", value: "SSC HiFi (Samsung), AAC" },
      ]),
      specGroup("Battery", [
        { label: "Playback", value: "Up to 30h with case" },
        { label: "Case charging", value: "Wireless Qi" },
      ]),
    ],
  },

  "Apple Watch Series 9": {
    sections: [
      {
        title: "Health & fitness",
        paragraphs: [
          "S9 SiP enables on-device Siri, Double Tap gesture control, and a brighter Always-On Retina display.",
          "Advanced health sensors track heart rate, blood oxygen, sleep stages, and temperature trends for cycle and wellness insights.",
        ],
      },
    ],
    highlights: [
      "S9 chip + Double Tap",
      "Bright Always-On display",
      "Precision Finding for iPhone",
      "50m water resistance",
    ],
    specs_detail: [
      specGroup("Hardware", [
        { label: "Case size", value: "45mm aluminum" },
        { label: "Display", value: "Always-On Retina" },
        { label: "Chip", value: "S9 SiP" },
      ]),
      specGroup("Health", [
        { label: "Heart rate", value: "Electrical + optical" },
        { label: "SpO2", value: "Blood oxygen app" },
        { label: "Temperature", value: "Wrist sensing" },
      ]),
      specGroup("Battery", [
        { label: "Life", value: "Up to 18 hours" },
        { label: "Low Power Mode", value: "Up to 36 hours" },
      ]),
    ],
  },

  "Garmin Fenix 7": {
    sections: [
      {
        title: "Outdoor multisport",
        paragraphs: [
          "Multi-band GNSS with SatIQ gives accurate tracks in dense forest and urban canyons — trusted by ultrarunners and mountaineers.",
          "Topo and ski maps, ClimbPro, and recovery metrics live on your wrist without needing a phone mid-activity.",
        ],
      },
    ],
    highlights: [
      "Multi-band GPS",
      "Up to 18-day smartwatch battery",
      "TopoActive maps",
      "Rugged fiber-reinforced polymer",
    ],
    specs_detail: [
      specGroup("GPS", [
        { label: "GNSS", value: "Multi-band GPS, GLONASS, Galileo" },
        { label: "Maps", value: "TopoActive (region dependent)" },
      ]),
      specGroup("Battery", [
        { label: "Smartwatch mode", value: "Up to 18 days" },
        { label: "GPS mode", value: "Up to 57 hours (settings vary)" },
      ]),
      specGroup("Build", [
        { label: "Case", value: "47mm fiber-reinforced polymer" },
        { label: "Water rating", value: "10 ATM" },
      ]),
    ],
  },

  "Canon EOS R5": {
    sections: [
      {
        title: "Hybrid creator camera",
        paragraphs: [
          "45MP full-frame CMOS sensor with Dual Pixel CMOS AF II covers 100% area with 1,053 AF zones — excellent for wildlife and sports.",
          "8K RAW internal recording and 4K 120p slow motion make this a one-body solution for filmmakers and still photographers.",
        ],
      },
    ],
    highlights: [
      "45MP full-frame sensor",
      "8K RAW internal video",
      "Dual Pixel CMOS AF II",
      "5-axis IBIS up to 8 stops",
    ],
    specs_detail: [
      specGroup("Sensor", [
        { label: "Type", value: "45MP full-frame CMOS" },
        { label: "ISO range", value: "100–51200 (expandable)" },
        { label: "IBIS", value: "Up to 8 stops" },
      ]),
      specGroup("Video", [
        { label: "Max resolution", value: "8K 30p RAW internal" },
        { label: "4K", value: "Up to 120p" },
        { label: "Log", value: "Canon Log 3" },
      ]),
      specGroup("Autofocus", [
        { label: "System", value: "Dual Pixel CMOS AF II" },
        { label: "Animal AF", value: "Eyes, body (birds, animals)" },
      ]),
    ],
  },

  "PlayStation 5": {
    sections: [
      {
        title: "Next-gen gaming",
        paragraphs: [
          "Custom SSD architecture cuts load times dramatically — explore open worlds with minimal waiting between fast travel points.",
          "Ray tracing, 4K output up to 120Hz (game dependent), and Tempest 3D AudioTech deepen immersion on supported titles.",
        ],
      },
      {
        title: "DualSense",
        paragraphs: [
          "Adaptive triggers and haptic feedback translate in-game tension into physical sensation — especially in first-party Sony titles.",
        ],
      },
    ],
    highlights: [
      "Ultra-high-speed custom SSD",
      "DualSense haptics + adaptive triggers",
      "4K up to 120Hz (title dependent)",
      "PS4 backward compatibility",
    ],
    specs_detail: [
      specGroup("Performance", [
        { label: "CPU", value: "AMD Zen 2 8-core" },
        { label: "GPU", value: "AMD RDNA 2 10.28 TFLOPs" },
        { label: "RAM", value: "16GB GDDR6" },
        { label: "Storage", value: "825GB SSD" },
      ]),
      specGroup("Output", [
        { label: "Resolution", value: "Up to 4K 120Hz" },
        { label: "Ray tracing", value: "Hardware accelerated" },
        { label: "Audio", value: "Tempest 3D AudioTech" },
      ]),
    ],
  },

  "Xbox Series X": {
    sections: [
      {
        title: "Most powerful Xbox",
        paragraphs: [
          "12 teraflops of GPU power, 1TB custom NVMe SSD, and Quick Resume let you switch between multiple recent titles instantly.",
          "Supports 4K gaming up to 120fps, VRR, and Auto Low Latency Mode on compatible TVs.",
        ],
      },
    ],
    highlights: [
      "12 TF GPU performance",
      "1TB custom SSD + expansion slot",
      "Quick Resume multiple games",
      "4K 120fps + VRR",
    ],
    specs_detail: [
      specGroup("Performance", [
        { label: "CPU", value: "AMD Zen 2 8-core @ 3.8 GHz" },
        { label: "GPU", value: "12 TFLOPs, 52 CUs @ 1.825 GHz" },
        { label: "RAM", value: "16GB GDDR6" },
        { label: "Storage", value: "1TB custom NVMe SSD" },
      ]),
      specGroup("Features", [
        { label: "Resolution", value: "Up to 4K, 120fps" },
        { label: "VRR", value: "HDMI 2.1 VRR" },
        { label: "Backward compat", value: "Xbox One, select 360/OG" },
      ]),
    ],
  },

  "Nintendo Switch OLED": {
    sections: [
      {
        title: "Handheld + TV",
        paragraphs: [
          "7-inch OLED screen delivers deeper blacks and vivid colors in handheld mode — a meaningful upgrade for Mario, Zelda, and indie pixel art.",
          "64GB internal storage, wide adjustable stand, and enhanced speakers improve on-the-go sessions.",
        ],
      },
    ],
    highlights: [
      "7\" OLED handheld display",
      "64GB storage",
      "TV dock included",
      "Joy-Con detachable controllers",
    ],
    specs_detail: [
      specGroup("Display", [
        { label: "Screen", value: "7\" OLED capacitive touch" },
        { label: "Resolution", value: "1280 × 720 handheld" },
        { label: "TV output", value: "Up to 1080p via dock" },
      ]),
      specGroup("Hardware", [
        { label: "Storage", value: "64GB (expandable microSD)" },
        { label: "Battery", value: "4.5–9 hours (title dependent)" },
        { label: "Modes", value: "Handheld, tabletop, TV" },
      ]),
    ],
  },

  "MagSafe Charger 15W": {
    sections: [
      {
        title: "Wireless charging",
        paragraphs: [
          "Aligns magnetically with iPhone 12 and later for up to 15W fast wireless charging — also charges AirPods with MagSafe case.",
          "Compact puck design fits desks and nightstands; 1m USB-C cable included (20W adapter recommended, sold separately).",
        ],
      },
    ],
    highlights: [
      "Up to 15W on compatible iPhone",
      "MagSafe magnetic alignment",
      "Works with MagSafe AirPods case",
      "USB-C cable included",
    ],
    specs_detail: [
      specGroup("Charging", [
        { label: "Max power", value: "15W (iPhone 12+)" },
        { label: "Standard", value: "Qi + MagSafe" },
        { label: "Cable", value: "USB-C, 1 m" },
      ]),
      specGroup("Compatibility", [
        { label: "iPhone", value: "MagSafe iPhone models" },
        { label: "AirPods", value: "MagSafe charging case" },
      ]),
    ],
  },

  "Logitech MX Master 3S": {
    sections: [
      {
        title: "Productivity mouse",
        paragraphs: [
          "8,000 DPI Darkfield tracking works on glass desks. Quiet clicks reduce noise in open offices and late-night sessions.",
          "MagSpeed electromagnetic scroll wheel switches between ratchet precision and hyper-fast flick scrolling.",
        ],
      },
    ],
    highlights: [
      "8K DPI tracks on glass",
      "Quiet click switches",
      "MagSpeed scroll wheel",
      "USB-C quick charge",
    ],
    specs_detail: [
      specGroup("Sensor", [
        { label: "DPI", value: "200–8000, Darkfield" },
        { label: "Polling", value: "125 Hz (Bluetooth)" },
      ]),
      specGroup("Battery", [
        { label: "Battery", value: "Rechargeable Li-Po" },
        { label: "Charge", value: "USB-C, 1 min = 3 hours use" },
      ]),
      specGroup("Connectivity", [
        { label: "Wireless", value: "Bluetooth Low Energy" },
        { label: "Multi-device", value: "Easy-Switch 3 devices" },
      ]),
    ],
  },
};

const DEFAULT_FOOTER =
  "Genuine stock with manufacturer warranty. Ships in protective packaging with tracked delivery. Pay via MoMo, bank transfer, or cash on delivery. Our AI assistant and live chat team can help you compare models before purchase.";

export function getProductRichContent(productName, images = []) {
  const content = PRODUCT_CONTENT[productName];
  if (!content) {
    return {
      description: buildMarkdownDescription({
        title: productName,
        intro:
          "Premium electronics with verified specifications. Contact support for compatibility questions before ordering.",
        highlights: [
          "Factory-sealed unit",
          "Official warranty",
          "Nationwide delivery",
        ],
        images: images.slice(0, 1),
        footer: DEFAULT_FOOTER,
      }),
      specs_detail: null,
    };
  }

  const gallery = images.filter(Boolean);
  const sectionsWithImages = content.sections.map((section, index) => ({
    ...section,
    image: index === 0 && gallery[1] ? gallery[1] : section.image,
  }));

  return {
    description: buildMarkdownDescription({
      title: productName,
      intro: PRODUCT_INTROS[productName] ?? `${productName} — premium electronics with full specs below.`,
      sections: sectionsWithImages,
      highlights: content.highlights,
      images: gallery.slice(0, 1),
      footer: DEFAULT_FOOTER,
    }),
    specs_detail: content.specs_detail,
  };
}
