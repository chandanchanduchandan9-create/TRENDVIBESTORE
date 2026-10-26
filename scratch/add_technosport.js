import fs from 'fs';
import path from 'path';

const productsPath = path.resolve('data/products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));

// Check if already exists
const existing = products.find(p => p.id === 'PROD-CLOTH-007');
if (existing) {
  console.log('PROD-CLOTH-007 already exists!');
  process.exit(0);
}

const technoSportTee = {
  id: "PROD-CLOTH-007",
  name: "TechnoSport Performance Dry-Fit Active T-Shirt",
  category: "clothing",
  brand: "TechnoSport",
  description: "Official TechnoSport (Tecno Sport) high-performance breathable dry-fit sports t-shirt (teshirt). Features Odegard anti-odour tech, UPF 50+ UV sun protection, and TechnoDry 4-way stretch micro-poly fabric for running, gym workout, and training.",
  price: 699,
  discountPercent: 20,
  salePrice: 559,
  currency: "INR",
  currencySymbol: "₹",
  colours: [
    "Jet Black",
    "Electric Blue",
    "Anthracite Grey",
    "Crimson Red",
    "Neon Lime Green"
  ],
  sizes: [
    "S",
    "M",
    "L",
    "XL",
    "XXL"
  ],
  stock: {
    overall: 45,
    variants: {
      "Jet Black-S": 5,
      "Jet Black-M": 12,
      "Jet Black-L": 10,
      "Jet Black-XL": 6,
      "Electric Blue-M": 8,
      "Electric Blue-L": 4
    }
  },
  inStock: true,
  deliveryInfo: "Express delivery in 2-4 business days across India. Free delivery above ₹999.",
  deliveryDays: "2-4 days",
  deliveryCharges: 49,
  freeDeliveryAbove: 999,
  returnPolicy: "7-day doorstep return policy with original tags attached.",
  exchangePolicy: "Free instant size and colour exchange within 7 days of delivery.",
  refundPolicy: "100% refund credited to original payment method or UPI within 48 hours.",
  paymentMethods: [
    "Cash on Delivery (COD)",
    "UPI (Google Pay / PhonePe / Paytm)",
    "Credit & Debit Cards",
    "Net Banking"
  ],
  codAvailable: true,
  warranty: "100% genuine TechnoSport brand guarantee against manufacturing defects.",
  specs: {
    fabric: "100% High-Performance TechnoDry Micro-Polyester",
    technology: "Odegard Anti-Bacterial Odour Resistance & Sweat Wicking",
    uvProtection: "UPF 50+ Sun Protection (Blocks 98% harmful UV rays)",
    fit: "Athletic Regular Fit with 4-Way Stretch",
    neck: "Ribbed Crew Neck with flatlock anti-chafing seams",
    weight: "Ultralight 140 GSM breathable mesh knit",
    washCare: "Machine wash cold. Quick dry. Do not iron directly on reflective logo.",
    origin: "Proudly Crafted in India"
  },
  imageUrl: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&auto=format&fit=crop&q=80",
  videoUrl: "/videos/clothing_reel.mp4",
  instagramVideoPostUrl: "https://www.instagram.com/reel/C8_TechnoSport_Tee_007/",
  instagramPostId: "ig_reel_technosport_007",
  similarProductIds: [
    "PROD-CLOTH-001",
    "PROD-SHOE-001"
  ]
};

products.push(technoSportTee);
fs.writeFileSync(productsPath, JSON.stringify(products, null, 2), 'utf-8');
console.log(`Successfully added ${technoSportTee.name} to store! Total products: ${products.length}`);
