// scratch/generate_health_mock_source_data.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'health_products_mock_source_data.json');

const rawCatalog = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8'));
const medProducts = rawCatalog.filter(p => p.category === 'Medicines & Healthcare Products');

console.log(`Loaded ${medProducts.length} medicine products from products.json`);

// Helper to construct structured health product record following the 22-section schema
function buildHealthProductRecord(raw) {
  const id = raw.id;
  const name = raw.name;
  const brand = raw.brand;
  const dosageForm = raw.dosageForm;
  const strength = raw.strength;
  const packSize = raw.packSize;
  const price = raw.price || raw.salePrice;
  const mrp = raw.mrp;
  const discountPercent = raw.discountPercent || Math.round(((mrp - price) / mrp) * 100);
  const discountAmount = mrp - price;
  const stockCount = raw.stockCount || 50;
  const batchNumber = raw.batchNumber || `BATCH-DEMO-${id}`;
  const mfgDate = raw.manufacturingDate || '2026-01-15';
  const expDate = raw.expiryDate || '2028-01-31';
  const gtin = raw.gtin || raw.barcode || '8900000000000';

  // Subcategory identification
  let subcategory = 'General Healthcare';
  let isOrs = false;
  let isCream = false;
  let isGel = false;
  let isLotion = false;
  let isSpray = false;
  let isTablet = false;
  let isBalm = false;

  const formLower = dosageForm.toLowerCase();
  const nameLower = name.toLowerCase();

  if (formLower.includes('powder') || nameLower.includes('ors') || formLower.includes('ready-to-drink')) {
    subcategory = 'Oral Rehydration & Electrolytes';
    isOrs = true;
  } else if (nameLower.includes('antacid') || nameLower.includes('digene')) {
    subcategory = 'Antacids & Digestive Health';
    isTablet = true;
  } else if (nameLower.includes('dolo') || nameLower.includes('calpol')) {
    subcategory = 'Analgesics & Antipyretics';
    isTablet = true;
  } else if (nameLower.includes('cetzine')) {
    subcategory = 'Antihistamines & Anti-Allergics';
    isTablet = true;
  } else if (nameLower.includes('betadine')) {
    subcategory = 'Topical Antiseptics';
  } else if (nameLower.includes('lacto calamine') || formLower.includes('lotion')) {
    subcategory = 'Skincare & Calamine Lotions';
    isLotion = true;
  } else if (nameLower.includes('cream')) {
    subcategory = 'Topical Pain Relief Creams';
    isCream = true;
  } else if (nameLower.includes('gel')) {
    subcategory = 'Topical Pain Relief Gels';
    isGel = true;
  } else if (nameLower.includes('spray')) {
    subcategory = 'Pain Relief Sprays';
    isSpray = true;
  } else if (nameLower.includes('balm')) {
    subcategory = 'Herbal & Ayurvedic Pain Balms';
    isBalm = true;
  }

  // Active ingredients parsing
  const rawActive = Array.isArray(raw.activeIngredients) ? raw.activeIngredients : [raw.activeIngredients];
  const activeIngredientsList = rawActive.map((item) => {
    return {
      ingredient_name: item,
      quantity_or_strength: strength || 'Specified in product monograph',
      unit: 'Standard pharmacological unit',
      function_purpose: raw.purpose || 'Active therapeutic constituent',
      ingredient_source: 'Pharmaceutical / Pharmacopoeial specification',
      formulation_info: `${dosageForm} formulation`,
      ingredient_status: 'MOCK DATA — NOT VERIFIED FOR REAL-WORLD USE'
    };
  });

  // Inactive excipients parsing
  const rawInactive = Array.isArray(raw.inactiveIngredients) ? raw.inactiveIngredients : (raw.inactiveIngredients ? [raw.inactiveIngredients] : []);
  const completeIngredientsList = [
    ...activeIngredientsList.map(a => ({
      ingredient_name: a.ingredient_name,
      quantity: a.quantity_or_strength,
      unit: a.unit,
      ingredient_type: 'Active Pharmaceutical Ingredient',
      purpose: a.function_purpose,
      allergen_information: 'Check individual sensitivity',
      source_origin: 'Synthetic / Herbal / Mineral Pharmacopoeial source',
      status: 'MOCK DATA — DEMONSTRATION ONLY'
    })),
    ...rawInactive.map(i => ({
      ingredient_name: i,
      quantity: 'q.s. (quantum satis) / excipient ratio',
      unit: 'Standard excipient base',
      ingredient_type: 'Inactive Excipient / Base',
      purpose: 'Formulation stability, preservation, bulking, or flavor',
      allergen_information: i.toLowerCase().includes('lactose') ? 'Contains Lactose (avoid in galactose intolerance)' : 'Standard excipient',
      source_origin: 'Pharmaceutical grade excipient',
      status: 'MOCK DATA — DEMONSTRATION ONLY'
    }))
  ];

  // Specific Customer QA variations generator
  const customerQA = {
    Product_Questions: [
      {
        question: "What is this medicine?",
        question_variations: [
          `What is ${name}?`,
          "What is this product?",
          `Tell me about ${name}`,
          "Can you describe this product?"
        ],
        answer: `${name} is a ${dosageForm} manufactured by ${raw.manufacturerName || brand}. It is intended for: ${raw.purpose} This record represents demonstration store data (DATA_STATUS: MOCK / DEMONSTRATION DATA).`
      },
      {
        question: "What type of medicine or formulation is this?",
        question_variations: [
          `Is this an ORS?`,
          `Is this a cream?`,
          `Is this a gel?`,
          `Is this a lotion?`,
          `What dosage form is ${name}?`
        ],
        answer: `${name} is formulated as a ${dosageForm}. ${isOrs ? 'Yes, this is an Oral Rehydration product.' : isCream ? 'Yes, this is a topical cream.' : isGel ? 'Yes, this is a topical gel.' : isLotion ? 'Yes, this is a topical emulsion lotion.' : isSpray ? 'Yes, this is an aerosol spray.' : isBalm ? 'Yes, this is a topical pain balm.' : isTablet ? 'No, this is an oral tablet formulation.' : `It is categorized as ${subcategory}.`} This is demonstration data.`
      },
      {
        question: "What are the benefits and key features of this product?",
        question_variations: [
          "What are its benefits?",
          `Why should I use ${name}?`,
          "What does it do?",
          "What are the main features?"
        ],
        answer: `Demonstration benefits for ${name}: ${raw.benefits} Key purpose: ${raw.purpose} Please note that all benefits listed are from demonstration store records.`
      }
    ],

    Use_Questions: [
      {
        question: "What is it used for?",
        question_variations: [
          `What is ${name} used for?`,
          "What conditions does this treat?",
          "What is the intended purpose of this medicine?",
          "Why is this prescribed or used?"
        ],
        answer: `${name} is indicated for: ${raw.purpose}. Always verify indications against the package label or consult a healthcare professional. (DATA_STATUS: MOCK / DEMONSTRATION DATA)`
      },
      {
        question: "How do I use it?",
        question_variations: [
          "How should I take this?",
          "How do I apply this?",
          "What is the dosage instruction?",
          "How many times a day should I use it?",
          "Before or after food?"
        ],
        answer: `${name} administration instructions: ${raw.howToUse} Check the product container label before administration. This demonstration record does not replace individual clinical instructions.`
      },
      {
        question: "What are the preparation instructions?",
        question_variations: [
          "Do I need to mix this with water?",
          "How do I prepare this?",
          "Preparation instructions please"
        ],
        answer: isOrs 
          ? `Preparation details for ${name}: ${raw.howToUse} Ensure potable drinking water is used and do not boil after reconstitution. (Demo data)`
          : `Preparation not required; ${name} is supplied ready for use as a ${dosageForm}. Follow package label.`
      }
    ],

    Ingredient_Questions: [
      {
        question: "What are the active ingredients?",
        question_variations: [
          `What are the ingredients in ${name}?`,
          "What is the active constituent?",
          "What is the strength of this medicine?",
          "Tell me the chemical composition"
        ],
        answer: `The demonstration record for ${name} lists the following active constituents: ${rawActive.join(', ')}. Official strength: ${strength}. (MOCK DATA — NOT VERIFIED FOR REAL-WORLD USE)`
      },
      {
        question: "Are there any inactive ingredients or excipients?",
        question_variations: [
          "Does it contain inactive excipients?",
          "Are there preservatives or colors?",
          "What is in the base?"
        ],
        answer: `Excipients recorded for ${name}: ${rawInactive.length > 0 ? rawInactive.join(', ') : 'Excipient formulation details not specified in current demo record'}. Please inspect packaging for exact formulation.`
      }
    ],

    Safety_Questions: [
      {
        question: "What are the side effects?",
        question_variations: [
          "Does it have any side effects?",
          "Are there adverse reactions?",
          "What are the serious warning signs?"
        ],
        answer: `Documented possible side effects for ${name}: ${raw.sideEffects}. If unexpected or severe symptoms occur, discontinue use and consult a physician immediately.`
      },
      {
        question: "What are the warnings and precautions?",
        question_variations: [
          "Are there any warnings?",
          "What precautions should I take?",
          "Who should not take this?"
        ],
        answer: `Warnings: ${raw.warnings} Contraindications: ${raw.contraindications} Special precautions: ${raw.allergyInfo}. (MOCK DATA — DEMONSTRATION ONLY)`
      },
      {
        question: "Can children or infants use this?",
        question_variations: [
          "Is this safe for kids?",
          "Can children take this?",
          "What is the minimum age?"
        ],
        answer: `Age recommendations for ${name}: ${raw.ageRestrictions}. Pediatric use should strictly adhere to official packaging guidelines and a pediatrician's guidance.`
      },
      {
        question: "Is it safe during pregnancy or breastfeeding?",
        question_variations: [
          "Can pregnant women use this?",
          "Is it safe while breastfeeding?",
          "Pregnancy warnings"
        ],
        answer: `Pregnancy & Lactation information: ${raw.pregnancyWarnings || raw.pregnancyBreastfeeding || 'Consult an obstetrician or physician before use during pregnancy or lactation.'} (Demo data)`
      },
      {
        question: "Does it interact with alcohol or other medications?",
        question_variations: [
          "Can I drink alcohol while taking this?",
          "Are there drug interactions?",
          "Food interactions"
        ],
        answer: `Interaction profile: Known drug interactions: ${raw.drugInteractions}. General alcohol/lifestyle note: Avoid alcohol where paracetamol or central nervous system effects are involved. Consult a physician for specific multi-drug regimens.`
      }
    ],

    Price_Questions: [
      {
        question: "How much does it cost?",
        question_variations: [
          "What is the price?",
          "How much is this medicine?",
          "What's the cost?",
          "Price please",
          `How much does ${name} cost?`
        ],
        answer: `The demonstration store price for ${name} is ₹${price}. (MRP: ₹${mrp}, with a ₹${discountAmount} discount / ${discountPercent}% off).`
      },
      {
        question: "Is there any discount or offer?",
        question_variations: [
          "Is there a discount?",
          "Do you have an offer on this?",
          "What is the MRP vs selling price?"
        ],
        answer: `Yes, ${name} has a demonstration discount of ${discountPercent}% off (Saving ₹${discountAmount} off the MRP of ₹${mrp}). Sale price is ₹${price}.`
      }
    ],

    Availability_Questions: [
      {
        question: "Is it available in stock?",
        question_variations: [
          "Is it available?",
          "Is this in stock?",
          "How many units do you have?",
          "Can I order right now?"
        ],
        answer: `Yes, ${name} is currently In Stock in the demonstration store inventory with ${stockCount} units available.`
      },
      {
        question: "How long does delivery take?",
        question_variations: [
          "What is the delivery time?",
          "Can you deliver to my pincode?",
          "Shipping timeline"
        ],
        answer: `Estimated delivery for ${name}: ${raw.deliveryInfo || 'Express delivery in 2-4 business days across serviceable pin codes.'}`
      }
    ],

    General_Questions: [
      {
        question: "Who is the manufacturer?",
        question_variations: [
          "Who makes this?",
          "Manufacturer name",
          "Where is it made?",
          "Country of origin"
        ],
        answer: `${name} is manufactured by ${raw.manufacturerName} (${raw.manufacturerAddress || 'Manufacturing Unit'}). Country of origin: ${raw.countryOfOrigin || 'India'}. Manufacturing licence: ${raw.manufacturingLicence || 'MOCK DATA — DEMONSTRATION ONLY'}.`
      },
      {
        question: "What is the expiry date and batch number?",
        question_variations: [
          "When does it expire?",
          "What is the shelf life?",
          "What is the batch number?",
          "Manufacturing date"
        ],
        answer: `Demonstration batch details for ${name}: Batch #${batchNumber}, Manufactured: ${mfgDate}, Expiry Date: ${expDate}.`
      },
      {
        question: "How should I store this product?",
        question_variations: [
          "Where should I keep this?",
          "Does it need refrigeration?",
          "Storage temperature"
        ],
        answer: `Storage guidelines: ${raw.storageInstructions}. Always keep medicines out of reach and sight of children.`
      },
      {
        question: "What is the return and refund policy?",
        question_variations: [
          "Can I return this if unopened?",
          "Is there a refund policy?",
          "Exchange policy"
        ],
        answer: `Store return policy: ${raw.returnPolicy} Exchange policy: ${raw.exchangePolicy}`
      }
    ]
  };

  // Structured HEALTH_PRODUCT record according to Section 22
  return {
    DATA_STATUS: "MOCK / DEMONSTRATION DATA",
    HEALTH_PRODUCT: {
      Product_Identity: {
        Product_ID: id,
        SKU: `SKU-${id}`,
        Product_Name: name,
        Brand: brand,
        Product_Type: "Health Product",
        Category: "Medicines & Healthcare Products",
        Subcategory: subcategory,
        Dosage_Form: dosageForm,
        Variant: raw.variant || name,
        Strength: strength,
        Pack_Size: packSize,
        Barcode_GTIN: gtin,
        Prescription_Status: raw.prescriptionStatus || "Over-the-Counter (OTC)",
        Product_Status: "Active",
        Data_Status: "MOCK / DEMONSTRATION DATA",
        Source_Type: "Mock Product Database",
        Last_Verified_Date: "18/09/2026"
      },
      Product_Description: {
        Short_Description: raw.description || `${name} is a ${dosageForm} formulated by ${brand}.`,
        Detailed_Description: `${name} is a pharmaceutical/health formulation produced by ${raw.manufacturerName || brand}. Packaged in ${packSize}. Indicated for: ${raw.purpose} (Demonstration record).`,
        Product_Purpose: raw.purpose,
        What_It_Is: `${name} is an authentic commercial healthcare formulation in ${dosageForm} presentation.`,
        What_It_Is_Used_For: raw.purpose,
        Intended_Use: raw.purpose,
        Product_Benefits: raw.benefits,
        Key_Features: [
          `Formulation: ${dosageForm}`,
          `Strength: ${strength}`,
          `Pack Size: ${packSize}`,
          `Prescription Classification: ${raw.prescriptionStatus || 'OTC'}`
        ],
        Suitable_Use_Cases: [
          raw.purpose
        ]
      },
      Medical_Information: {
        Active_Ingredients: activeIngredientsList,
        Ingredients: completeIngredientsList,
        Uses: raw.purpose,
        How_To_Use: raw.howToUse,
        Administration_Method: dosageForm.includes('Oral') ? 'Oral ingestion' : dosageForm.includes('Topical') ? 'Topical application to intact skin' : 'As directed on label',
        Preparation_Instructions: isOrs ? raw.howToUse : 'Ready to use. No preparation required.',
        Recommended_Usage: raw.howToUse,
        Frequency: 'Follow prescribed or label intervals.',
        Duration: 'As required for acute relief or as directed by doctor.',
        Before_After_Food: dosageForm.includes('Oral Tablet') ? 'Preferably after meals with a glass of water.' : 'Not applicable.',
        Application_Instructions: (isCream || isGel || isSpray || isBalm || isLotion) ? raw.howToUse : 'Not applicable for oral formulations.',
        Special_Instructions: raw.warnings,
        Label_Instructions: 'Read entire carton label and enclosed leaflet prior to use.',
        Age_Restrictions: raw.ageRestrictions,
        Minimum_Age: raw.ageRestrictions.includes('12') ? '12 years' : raw.ageRestrictions.includes('Adult') ? 'Adult use' : 'Consult pediatrician',
        Maximum_Age: 'No defined upper limit; geriatric precautions apply.',
        Adult_Use: 'Approved per label guidelines.',
        Child_Use: raw.ageRestrictions,
        Infant_Use: 'Contraindicated unless explicitly prescribed by a pediatrician.',
        Elderly_Use: 'Use standard adult dose; monitor renal and hepatic tolerance.',
        Pediatric_Warning: 'Keep strictly out of reach of children.',
        Special_Population_Information: raw.contraindications,
        Side_Effects: raw.sideEffects,
        Common_Side_Effects: raw.sideEffects,
        Possible_Side_Effects: 'Mild localized or gastrointestinal sensitivity.',
        Serious_Side_Effects: 'Severe allergic response, anaphylaxis, or acute toxicity upon overdose.',
        Important_Warnings: raw.warnings,
        Precautions: raw.warnings,
        Contraindications: raw.contraindications,
        Allergy_Information: raw.allergyInfo,
        Drug_Interactions: raw.drugInteractions,
        Food_Interactions: 'Refer to physician advice; avoid alcohol.',
        Alcohol_Interaction: raw.warnings.includes('alcohol') ? 'Avoid concurrent alcohol intake.' : 'No known specific acute interaction, avoid excessive alcohol.',
        Pregnancy_Information: raw.pregnancyWarnings || raw.pregnancyBreastfeeding,
        Breastfeeding_Information: raw.breastfeedingWarnings || raw.pregnancyBreastfeeding,
        Medical_Condition_Warnings: raw.contraindications
      },
      Storage: {
        Storage_Instructions: raw.storageInstructions,
        Temperature: 'Store below 25°C to 30°C in a dry environment.',
        Storage_Location: 'Cool, dark, dry storage area away from children.',
        Light_Protection: 'Store in original packaging protected from direct sunlight.',
        Moisture_Protection: 'Protect from moisture and humidity.',
        Refrigeration_Requirement: 'Do not freeze; refrigeration not required unless stated on pack.',
        Keep_Container_Closed: 'Keep cap/seal tightly closed when not in use.',
        Keep_Away_From_Children: 'Keep out of reach and sight of children.',
        Storage_After_Opening: 'Use within designated period or discard if packaging compromised.',
        Shelf_Life: '24 to 36 months from date of manufacture.',
        Disposal_Instructions: 'Dispose of unused medicine safely per local pharmaceutical disposal regulations.'
      },
      Manufacturing: {
        Manufacturer: raw.manufacturerName,
        Manufacturer_Address: raw.manufacturerAddress || 'Industrial Area, India',
        Manufacturing_Location: raw.manufacturerAddress || 'India',
        Manufacturing_Date: mfgDate,
        Batch_Number: batchNumber,
        Expiry_Date: expDate,
        MRP: `₹${mrp}`,
        Manufacturing_Licence: `${raw.manufacturingLicence || 'MFG-DEMO-LIC-0099'} (MOCK DATA — DEMONSTRATION ONLY)`,
        Registration_Information: `${raw.registrationApproval || 'REG-CDSCO-DEMO-2026'} (MOCK DATA — DEMONSTRATION ONLY)`,
        Regulatory_Information: raw.regulatorySource || 'CDSCO Guidelines (Demo)',
        Country_Of_Manufacture: raw.countryOfOrigin || 'India'
      },
      Regulatory: {
        Prescription_Status: raw.prescriptionStatus || 'Over-the-Counter (OTC)',
        Licence_Information: `${raw.manufacturingLicence || 'MFG-DEMO-LIC-0099'} (MOCK DATA — DEMONSTRATION ONLY)`,
        Registration_Information: `${raw.registrationApproval || 'REG-CDSCO-DEMO-2026'} (MOCK DATA — DEMONSTRATION ONLY)`,
        Quality_Information: raw.testingQuality || 'Tested per applicable Pharmacopoeial monographs.',
        Testing_Information: raw.gmpCertification || 'WHO-GMP compliant manufacturing facility (Demo record).'
      },
      Store_Inventory: {
        Store_SKU: `SKU-${id}`,
        Availability: stockCount > 0 ? 'In Stock' : 'Out of Stock',
        Stock_Quantity: stockCount,
        Stock_Status: stockCount > 10 ? 'Healthy Stock' : 'Low Stock',
        Price: `₹${price}`,
        Price_Numeric: price,
        MRP: `₹${mrp}`,
        MRP_Numeric: mrp,
        Discount: `₹${discountAmount}`,
        Discount_Percentage: `${discountPercent}%`,
        Offer: `${discountPercent}% off retail price`,
        Delivery: 'Available across all serviceable pin codes',
        Estimated_Delivery_Information: raw.deliveryInfo || '2-4 business days',
        Return_Policy: raw.returnPolicy,
        Exchange_Policy: raw.exchangePolicy,
        Refund_Policy: 'Refund issued upon verified delivery defect or cancellation prior to dispatch.'
      },
      Customer_QA: customerQA,
      Source_Metadata: {
        Source_Type: "Mock Product Database / Demonstration Records",
        Source_Name: "TrendVibe Health Mock Knowledge Base",
        Source_URL: "http://localhost:3000/api/tools/getMedicineDetails",
        Source_Document: "Standard Mock Healthcare Data Specification v1.0",
        Verification_Status: "MOCK / DEMONSTRATION DATA",
        Last_Verified: "18/09/2026",
        Verified_Fields: [
          "Product_Identity",
          "Product_Description",
          "Medical_Information",
          "Storage",
          "Manufacturing",
          "Regulatory",
          "Store_Inventory",
          "Customer_QA"
        ]
      }
    }
  };
}

const mockDatabase = {
  metadata: {
    system: "TrendVibe AI Social Media Shopping Sales Voice Agent",
    catalog: "Medicines & Healthcare Products Mock Source Data",
    data_status: "MOCK / DEMONSTRATION DATA",
    generated_at: new Date().toISOString(),
    total_products: medProducts.length,
    core_rule: "Each health product has its own independent record. Information must NEVER be merged or transferred across products."
  },
  products: medProducts.map(p => buildHealthProductRecord(p))
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mockDatabase, null, 2), 'utf-8');
console.log(`Successfully generated mock source data for ${mockDatabase.products.length} products to ${OUTPUT_FILE}`);
