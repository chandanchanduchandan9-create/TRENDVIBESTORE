// scratch/update_asus_vivobook.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const productsJsonPath = path.resolve(__dirname, '../data/products.json');
const sheetsJsonPath = path.resolve(__dirname, '../data/sheets_exports/products.json');

const products = JSON.parse(fs.readFileSync(productsJsonPath, 'utf-8'));
const targetIdx = products.findIndex(p => p.id === 'PROD-LAP-004');

if (targetIdx === -1) {
  console.error('PROD-LAP-004 not found in products.json!');
  process.exit(1);
}

const existing = products[targetIdx];

// Customer QA from user prompt (all 31 questions and answers)
const customerQA = [
  {
    question: "What is ASUS Vivobook 15?",
    answer: "ASUS Vivobook 15 is a 15.6-inch laptop family designed for everyday computing, study, work and entertainment."
  },
  {
    question: "What processor does it have?",
    answer: "The processor depends on the exact Vivobook 15 model. The selected X1504VA configuration uses an Intel Core i5-1334U processor."
  },
  {
    question: "How much RAM does it have?",
    answer: "RAM depends on the exact model/SKU. Please provide the model number for the exact specification."
  },
  {
    question: "How much storage does it have?",
    answer: "Storage depends on the exact configuration. ASUS lists SSD configurations including 256 GB and 512 GB across the X1504 family."
  },
  {
    question: "Does it have an SSD?",
    answer: "Yes. Vivobook 15 X1504 configurations use M.2 NVMe PCIe SSD storage."
  },
  {
    question: "What is the display size?",
    answer: "The Vivobook 15 X1504 family has a 15.6-inch display."
  },
  {
    question: "What is the display resolution?",
    answer: "Supported X1504 configurations have a Full HD 1920 × 1080 display."
  },
  {
    question: "Is the display 60Hz?",
    answer: "The listed X1504 display configurations use a 60 Hz refresh rate."
  },
  {
    question: "Is it touchscreen?",
    answer: "Touchscreen availability depends on the exact configuration."
  },
  {
    question: "Does it have a webcam?",
    answer: "Yes. Supported configurations include a 720p HD camera with a privacy shutter."
  },
  {
    question: "Does it have Wi-Fi?",
    answer: "Yes. Vivobook 15 configurations support Wi-Fi 6 or Wi-Fi 6E depending on the exact model."
  },
  {
    question: "Does it have Bluetooth?",
    answer: "Yes. Bluetooth version depends on the exact configuration."
  },
  {
    question: "Does it have HDMI?",
    answer: "Yes. The X1504 specifications list HDMI 1.4."
  },
  {
    question: "Does it have USB Type-C?",
    answer: "Yes. The X1504 specifications include USB Type-C."
  },
  {
    question: "Is it good for students?",
    answer: "ASUS positions Vivobook 15 for everyday tasks including student and work use. Actual suitability depends on the exact configuration and the customer's workload."
  },
  {
    question: "Is it good for office work?",
    answer: "It is designed for everyday computing and productivity. The exact performance depends on the processor, RAM and storage configuration."
  },
  {
    question: "Can I use it for programming?",
    answer: "The laptop can support programming workloads, but suitability depends on the programming tools, projects and exact hardware configuration."
  },
  {
    question: "Can I use it for browsing?",
    answer: "Yes. Web browsing is an everyday computing workload supported by the laptop."
  },
  {
    question: "Can I use it for MS Office?",
    answer: "Microsoft Office availability depends on the specific retail configuration or bundle."
  },
  {
    question: "What operating system does it use?",
    answer: "Supported Vivobook 15 configurations use Windows 11 Home."
  },
  {
    question: "What is the weight?",
    answer: "Weight depends on the exact configuration. Check the exact ASUS model specification before answering."
  },
  {
    question: "Does it have a backlit keyboard?",
    answer: "Keyboard features vary by configuration. Verify the exact model."
  },
  {
    question: "Does it have a fingerprint sensor?",
    answer: "Fingerprint availability depends on the exact configuration."
  },
  {
    question: "What is the battery capacity?",
    answer: "Battery specifications depend on the exact model. Verify the exact SKU."
  },
  {
    question: "Does it support fast charging?",
    answer: "ASUS states that supported Vivobook 15 configurations can charge to 60% in as little as 49 minutes under its specified conditions."
  },
  {
    question: "What colors are available?",
    answer: "Color availability depends on the exact model and market."
  },
  {
    question: "Who manufactures it?",
    answer: "ASUS."
  },
  {
    question: "What is the price?",
    answer: "Retrieve the current price from the store inventory. Do not use an old web price as the current store price."
  },
  {
    question: "Is it available?",
    answer: "Retrieve availability from the store inventory."
  },
  {
    question: "Is there a discount?",
    answer: "Retrieve the current discount from the store inventory."
  },
  {
    question: "What is the warranty?",
    answer: "Warranty depends on the exact product and purchase market. Check the store/manufacturer warranty record for the exact SKU."
  }
];

// Update fields while preserving store properties & verify-system requirements
const updatedVivobook = {
  ...existing,
  alternateId: "LAP-ASUS-VIVOBOOK15-001",
  productFamily: "Vivobook",
  model: "X1504VA-BQ343WS",
  exactModel: "X1504VA-BQ343WS",
  modelFamily: "Vivobook 15 (X1504VA)",
  productType: "Laptop",
  targetCategory: "Student / Office / Everyday Computing",
  subcategory: "Everyday / Student / Office Laptop",
  productStatus: "Active",
  dataStatus: "VERIFIED PRODUCT INFORMATION",
  source: "ASUS Official India",
  description: "ASUS Vivobook 15 (X1504VA-BQ343WS) is a 15.6-inch laptop family designed for everyday computing, study, work and entertainment, equipped with 180-degree lay-flat hinge, 720p HD camera with privacy shutter, SonicMaster audio, and US MIL-STD-810H durability.",
  
  specs: {
    ...existing.specs,
    processorBrand: "Intel",
    processorFamily: "Intel Core",
    processor: "Intel Core i5-1334U / Core i5-1335U (10 cores, 12 threads: Base Frequency 1.3 GHz, Max Turbo up to 4.6 GHz, 12MB cache)",
    cpu: "Intel Core i5-1334U",
    baseFrequency: "1.3 GHz",
    maxTurboFrequency: "Up to 4.6 GHz",
    cores: 10,
    threads: 12,
    cache: "12 MB",
    graphicsType: "Integrated Graphics",
    graphics: "Intel Iris Xe Graphics (shared system memory)",
    gpu: "Intel Iris Xe Graphics",
    dedicatedGpu: "Not specified for this configuration",
    displaySize: "15.6 inches",
    displayResolution: "1920 × 1080",
    resolutionType: "Full HD",
    aspectRatio: "16:9",
    panelType: "LED-backlit",
    refreshRate: "60 Hz",
    surface: "Anti-glare",
    touchscreen: "Configuration dependent",
    brightness: "Verify against exact SKU (typically 250 nits)",
    screenToBodyRatio: "Up to 84% for the X1504 family",
    display: "15.6-inch FHD (1920 x 1080) 16:9, LED-backlit, 60Hz, 250 nits, Anti-glare, up to 84% screen-to-body ratio for the X1504 family",
    ramType: "DDR4 / DDR5 depending on exact configuration",
    installedRam: "16GB (8GB onboard + 8GB SO-DIMM, or verify exact SKU)",
    ramUpgradeable: "Configuration dependent (SO-DIMM slot upgradeable up to 24GB)",
    memorySlot: "SO-DIMM slot",
    maximumMemory: "Up to 24GB",
    ram: "16GB DDR4 (8GB onboard + 8GB SO-DIMM, upgradeable up to 24GB; DDR4/DDR5 configuration dependent)",
    storageType: "M.2 NVMe PCIe SSD",
    storageCapacity: "512GB (configurations include 256GB and 512GB across X1504 family)",
    ssdInterface: "PCIe",
    storageExpansion: "M.2 slot",
    storage: "512GB M.2 NVMe PCIe SSD (upgradeable via M.2 slot; 256GB/512GB options across X1504 family)",
    additionalCloudStorage: "May be bundled with selected configurations",
    camera: "720p HD camera with physical privacy shutter slider",
    privacyShutter: "Yes",
    microphone: "Built-in array microphone",
    speaker: "Built-in speaker",
    audioTechnology: "SonicMaster audio technology with Dirac processing and AI Noise-Canceling",
    audio: "SonicMaster audio system with built-in speaker, built-in array microphone, and AI Noise-Canceling technology",
    wifi: "Wi-Fi 6 / Wi-Fi 6E depending on configuration",
    bluetooth: "Bluetooth 5.2 / 5.3 depending on configuration",
    wirelessConfiguration: "Exact SKU dependent",
    keyboardType: "Chiclet keyboard",
    numberPad: "Configuration dependent (included on ErgoSense keyboard)",
    backlitKeyboard: "Configuration dependent",
    keyTravel: "Configuration dependent (1.4mm key travel)",
    touchpad: "Precision touchpad",
    keyboard: "Chiclet keyboard with precision touchpad, ErgoSense design, and 180-degree lay-flat hinge",
    batteryType: "Li-ion",
    batteryCapacity: "Exact SKU dependent (42Wh 3-cell Li-ion)",
    battery: "42Wh 3-cell Li-ion battery (fast charging supported: recharges to 60% in as little as 49 minutes)",
    fastCharging: "Supported on selected Vivobook 15 configurations (charges to 60% in as little as 49 minutes under specified conditions)",
    chargingAdapter: "Configuration dependent (45W / 65W AC Adapter)",
    charging: "Fast-charging supported on selected configurations (charges to 60% in as little as 49 minutes with 45W/65W adapter)",
    ports: "2x USB 3.2 Gen 1 Type-A, 1x USB Type-C, 1x USB 2.0 Type-A, 1x HDMI 1.4, 1x 3.5 mm combo audio jack, 1x DC-in barrel plug",
    portsBreakdown: {
      usb3Gen1TypeA: 2,
      usbTypeC: 1,
      usb2TypeA: 1,
      hdmi: "HDMI 1.4",
      audio: "3.5 mm combo audio jack"
    },
    weight: "1.70 kg (Configuration dependent)",
    dimensions: "35.97 x 23.25 x 1.79 cm (Configuration dependent)",
    color: "Cool Silver, Quiet Blue (Configuration dependent)",
    hinge: "180-degree hinge on supported configurations",
    durability: "Selected configurations list US MIL-STD-810H military-grade testing; treated with ASUS Antimicrobial Guard Plus on high-touch surfaces.",
    operatingSystem: "Windows 11 Home",
    os: "Windows 11 Home 64-bit with lifetime validity",
    preinstalledAsusSoftware: "MyASUS",
    microsoftOffice: "Configuration/bundle dependent",
    microsoft365: "Configuration/bundle dependent",
    asusFeatures: [
      "ASUS Intelligent Performance Technology",
      "AI Noise Cancellation",
      "Battery Health Charging",
      "WiFi SmartConnect",
      "System Diagnosis",
      "Fan Profile",
      "Function Key Lock",
      "Tru2Life",
      "Webcam Privacy Shutter"
    ],
    cooling: "ASUS IceBlade 87-blade liquid-crystal polymer fan with dual heat pipes for whisper-quiet thermal dissipation",
    upgradeability: "1x SO-DIMM slot for RAM upgrade (up to 24GB total); 1x M.2 NVMe SSD slot is user-upgradeable.",
    warrantyRegistration: "Register online via ASUS official website (account.asus.com -> Product Registration) or via the pre-installed MyASUS app using the 15-character serial number on the bottom label and the original purchase invoice.",
    usage: "Everyday computing, study, office productivity, programming, browsing, and entertainment. Perfect for students and professionals.",
    gaming: "Capable of lightweight casual gaming (e.g. Dota 2, League of Legends, casual indie games); not intended for heavy 3D titles."
  },
  
  customerQA
};

products[targetIdx] = updatedVivobook;
fs.writeFileSync(productsJsonPath, JSON.stringify(products, null, 2), 'utf-8');
console.log('Successfully updated PROD-LAP-004 in products.json');

if (fs.existsSync(sheetsJsonPath)) {
  const sheetsProds = JSON.parse(fs.readFileSync(sheetsJsonPath, 'utf-8'));
  const sIdx = sheetsProds.findIndex(p => p.id === 'PROD-LAP-004');
  if (sIdx !== -1) {
    sheetsProds[sIdx] = updatedVivobook;
    fs.writeFileSync(sheetsJsonPath, JSON.stringify(sheetsProds, null, 2), 'utf-8');
    console.log('Successfully updated PROD-LAP-004 in sheets_exports/products.json');
  }
}
