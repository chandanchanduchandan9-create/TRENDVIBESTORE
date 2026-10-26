// scratch/add_food_dataset.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const SHEETS_PRODUCTS_FILE = path.join(DATA_DIR, 'sheets_exports/products.json');
const FOOD_DATASET_FILE = path.join(DATA_DIR, 'food_products_dataset.json');

// Read existing catalog
const catalog = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8'));

// The user-provided Food Product Dataset
const userFoodDataset = {
  "dataset_name": "Food Product AI Sales Agent Dataset",
  "version": "1.0",
  "purpose": "Product-specific factual knowledge for answering customer questions using the standard food product record template.",
  "important_note": "This is a realistic demo/reference dataset, not proof of actual store inventory, pricing, suppliers, laboratory results, FSSAI licence details, batch dates or manufacturer claims. Replace all demo/dynamic fields with live store data before production.",
  "foods": [
    // Will be populated below
  ],
  "ai_retrieval_rule": [
    "Identify the food from the customer message.",
    "Maintain product context until the customer changes the product.",
    "Identify the customer intent.",
    "Retrieve only that food's record.",
    "For price, discount, availability, stock and delivery, query the latest store database.",
    "For ingredients, preparation, cooking and food characteristics, use the product record and verified references.",
    "For nutrition, use the stated nutrition basis and clearly identify estimated/reference data.",
    "For allergies and dietary questions, do not infer beyond the recorded fields.",
    "If a required field is unavailable, say it is not available in verified store data.",
    "Never invent supplier names, batch numbers, testing results, certifications or FSSAI licence numbers.",
    "Never use another food's values as a substitute.",
    "Answer naturally in the customer's language; if the customer asks for Kannada, answer in Kannada."
  ]
};

// We will write the full food dataset to data/food_products_dataset.json
console.log('Writing food products dataset...');
