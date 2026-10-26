import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATASET_PATH = fs.existsSync(path.resolve(__dirname, '../../data/food_products_dataset.json'))
  ? path.resolve(__dirname, '../../data/food_products_dataset.json')
  : path.resolve(__dirname, '../data/food_products_dataset.json');

let cachedDataset = null;
function getFoodDataset() {
  if (!cachedDataset) {
    try {
      if (fs.existsSync(DATASET_PATH)) {
        cachedDataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf-8'));
      }
    } catch (err) {
      console.error('[FoodService] Failed to load food dataset:', err);
    }
  }
  return cachedDataset;
}

export class FoodService {
  /**
   * Identify food product from text or return null
   */
  static identifyProductFromText(text) {
    if (!text) return null;
    const lower = text.toLowerCase();

    // Direct IDs and SKUs
    if (/\b(food-001|rm-001|food-kar-001)\b/i.test(lower)) return db.getProductById('FOOD-KAR-001');
    if (/\b(food-002|rd-001|food-kar-002)\b/i.test(lower)) return db.getProductById('FOOD-KAR-002');
    if (/\b(food-003|ar-001|food-kar-003)\b/i.test(lower)) return db.getProductById('FOOD-KAR-003');
    if (/\b(food-004|vu-001|food-kar-004)\b/i.test(lower)) return db.getProductById('FOOD-KAR-004');
    if (/\b(food-005|ri-001|food-kar-005)\b/i.test(lower)) return db.getProductById('FOOD-KAR-005');
    if (/\b(food-006|vi-001|food-kar-006)\b/i.test(lower)) return db.getProductById('FOOD-KAR-006');
    if (/\b(food-007|ko-001|food-kar-007)\b/i.test(lower)) return db.getProductById('FOOD-KAR-007');
    if (/\b(food-008|av-001|food-kar-009)\b/i.test(lower)) return db.getProductById('FOOD-KAR-009');
    if (/\b(food-009|vs-001|food-kar-010)\b/i.test(lower)) return db.getProductById('FOOD-KAR-010');
    if (/\b(food-010|gy-001)\b/i.test(lower)) return db.getProductById('FOOD-010');

    // Names
    if (/\b(greek yogurt|plain yogurt|greek yoghurt)\b/i.test(lower)) return db.getProductById('FOOD-010');
    if (/\b(ragi mudde|mudde)\b/i.test(lower)) return db.getProductById('FOOD-KAR-001');
    if (/\b(ragi dosa)\b/i.test(lower)) return db.getProductById('FOOD-KAR-002');
    if (/\b(akki rotti|akki roti|rotti)\b/i.test(lower)) return db.getProductById('FOOD-KAR-003');
    if (/\b(vegetable uppittu|uppittu|upma)\b/i.test(lower)) return db.getProductById('FOOD-KAR-004');
    if (/\b(ragi idli)\b/i.test(lower)) return db.getProductById('FOOD-KAR-005');
    if (/\b(vegetable idli|veg idli)\b/i.test(lower)) return db.getProductById('FOOD-KAR-006');
    if (/\b(kosambari)\b/i.test(lower)) return db.getProductById('FOOD-KAR-007');
    if (/\b(sprouted moong|moong salad)\b/i.test(lower)) return db.getProductById('FOOD-KAR-008');
    if (/\b(avalakki|poha)\b/i.test(lower)) return db.getProductById('FOOD-KAR-009');
    if (/\b(vegetable sambar|sambar|saaru)\b/i.test(lower)) return db.getProductById('FOOD-KAR-010');
    if (/\b(protein ladoo|ladoo|laddu)\b/i.test(lower)) return db.getProductById('FOOD-GYM-001');
    if (/\b(oats banana pancake|oats pancake|banana pancake|pancake)\b/i.test(lower)) return db.getProductById('FOOD-GYM-002');
    if (/\b(peanut banana smoothie|peanut smoothie|banana smoothie|smoothie)\b/i.test(lower)) return db.getProductById('FOOD-GYM-003');

    return null;
  }

  /**
   * Find raw record from food_products_dataset.json matching product
   */
  static getDatasetRecord(product) {
    if (!product) return null;
    const dataset = getFoodDataset();
    if (!dataset || !dataset.foods) return null;

    return dataset.foods.find(f => 
      f["Product ID"] === product.id ||
      f["Product ID"] === product.alternateId ||
      f.SKU === product.sku ||
      (f["Food Name"] && f["Food Name"].toLowerCase() === (product.foodName || product.name || '').toLowerCase())
    ) || null;
  }

  /**
   * Process a customer question about a food product using the dataset knowledge
   */
  static processFoodQuestion({ text, product, currentLang = 'en' }) {
    if (!product) return null;
    const lower = text.toLowerCase();
    const isKn = currentLang === 'kn';
    const ds = FoodService.getDatasetRecord(product);

    // Helpers to get field from dataset or product record
    const getField = (dsKey, prodKey, fallback = 'Not available in verified store data.') => {
      if (ds && ds[dsKey] !== undefined && ds[dsKey] !== null) return ds[dsKey];
      if (product && product[prodKey] !== undefined && product[prodKey] !== null) return product[prodKey];
      return fallback;
    };

    const name = product.foodName || product.name || 'Food';

    // 1. PRODUCT INFORMATION / WHAT IS IT?
    if (/\b(what is|tell me about|details of|features of|give me the details|what type of food|what dish is this|ಬಗ್ಗೆ ತಿಳಿಸಿ|ಏನು|ವಿವರ)\b/i.test(lower) && 
        !/\b(price|cost|how much|delivery|deliver|stock|available|ingredient|allergen|protein|calorie|sugar|salt|oil|shelf life|store|storage|cancel|return|serving|portion|size|safety|hygiene|special|different|reheat|how to eat|method)\b/i.test(lower)) {
      const desc = getField('Description', 'description');
      const foodType = getField('Food Type', 'foodType');
      const cuisine = getField('Cuisine/Region', 'cuisineRegion');
      const subcat = getField('Subcategory', 'subcategory');

      if (isKn) {
        return {
          reply: `${name} (${subcat}): ${desc} ಆಹಾರದ ಪ್ರಕಾರ: ${foodType}, ಶೈಲಿ: ${cuisine}. ನೀವು ಇದನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಾ?`,
          toolCalled: 'getFoodDetails'
        };
      }
      return {
        reply: `${name} (${subcat}): ${desc} Type: ${foodType}, Cuisine: ${cuisine}. Would you like to place an order?`,
        toolCalled: 'getFoodDetails'
      };
    }

    // 2. INGREDIENT QUANTITIES
    if (/\b(how much of each ingredient|ingredient quantities|exact quantity|quantity of (each|ingredients)|ingredient proportion|ಪದಾರ್ಥಗಳ ಪ್ರಮಾಣ)\b/i.test(lower)) {
      const quantities = ds ? ds["Ingredient Quantities"] : product.ingredientQuantities;
      const formattedQty = quantities 
        ? (typeof quantities === 'object' ? Object.entries(quantities).map(([k, v]) => `${k}: ${v}`).join(', ') : quantities)
        : (product.ingredientQuantity || 'Standard verified portion');

      if (isKn) {
        return {
          reply: `${name} ನಲ್ಲಿ ಬಳಸಲಾಗುವ ಪದಾರ್ಥಗಳ ಪ್ರಮಾಣ: ${formattedQty}.`,
          toolCalled: 'getFoodIngredientQuantities'
        };
      }
      return {
        reply: `Ingredient quantities for ${name}: ${formattedQty}.`,
        toolCalled: 'getFoodIngredientQuantities'
      };
    }

    // 3. INGREDIENTS
    if (/\b(what ingredients|ingredients used|what is it made of|what's inside|contents|what ingredients are in|ಯಾವ ಪದಾರ್ಥಗಳು|ಪದಾರ್ಥಗಳು)\b/i.test(lower)) {
      const mainIngs = ds ? ds["Main Ingredients"].join(', ') : (product.mainIngredients ? product.mainIngredients.join(', ') : 'Standard ingredients');
      const compList = ds ? ds["Complete Ingredient List"] : (Array.isArray(product.completeIngredients) ? product.completeIngredients.join('; ') : product.completeIngredients);

      if (isKn) {
        return {
          reply: `${name} ನಲ್ಲಿ ಬಳಸಲಾದ ಮುಖ್ಯ ಪದಾರ್ಥಗಳು: ${mainIngs}. ಸಂಪೂರ್ಣ ವಿವರ: ${compList || mainIngs}.`,
          toolCalled: 'getFoodIngredients'
        };
      }
      return {
        reply: `Main ingredients in ${name}: ${mainIngs}. Complete ingredient formula: ${compList || mainIngs}.`,
        toolCalled: 'getFoodIngredients'
      };
    }

    // 4. PREPARATION METHOD / HOW DO YOU MAKE IT
    if (/\b(how is it prepared|how do you make|how to make|preparation method|how is .*?prepared|hege maaduvudu|ತಯಾರಿಸುವ ವಿಧಾನ|ಹೇಗೆ ಮಾಡುವುದು)\b/i.test(lower)) {
      const prep = getField('Preparation Method', 'preparationMethod');
      if (isKn) {
        return {
          reply: `${name} ತಯಾರಿಸುವ ವಿಧಾನ: ${prep}`,
          toolCalled: 'getFoodDetails'
        };
      }
      return {
        reply: `Preparation method for ${name}: ${prep}`,
        toolCalled: 'getFoodDetails'
      };
    }

    // 5. COOKING METHOD
    if (/\b(how is it cooked|what cooking method|cooking method|is it boiled|is it steamed|is it fried|ಅಡುಗೆ ವಿಧಾನ)\b/i.test(lower)) {
      const cook = getField('Cooking Method', 'cookingMethod');
      if (isKn) {
        return {
          reply: `${name} ಅಡುಗೆ ವಿಧಾನ: ${cook}.`,
          toolCalled: 'getFoodCookingMethod'
        };
      }
      return {
        reply: `Cooking method for ${name}: ${cook}.`,
        toolCalled: 'getFoodCookingMethod'
      };
    }

    // 6 & 7. PREPARATION / COOKING TIME
    if (/\b(how long does it take to (cook|prepare)|preparation time|cooking time|time to prepare|time to cook|ಎಷ್ಟು ಸಮಯ)\b/i.test(lower)) {
      const prepTime = getField('Preparation Time', 'preparationTime');
      const cookTime = getField('Cooking Time', 'cookingTime');
      const totalTime = getField('Total Preparation/Cooking Time', 'totalTime', `${cookTime}`);

      if (isKn) {
        return {
          reply: `${name} ಅಡುಗೆ ಸಮಯ: ${cookTime} (ಒಟ್ಟು ಸಮಯ: ${totalTime}).`,
          toolCalled: 'getFoodCookingTime'
        };
      }
      return {
        reply: `Cooking time for ${name}: ${cookTime} (Total preparation and cooking: ${totalTime}).`,
        toolCalled: 'getFoodCookingTime'
      };
    }

    // 8. OIL TYPE & QUANTITY
    if (/\b(what oil|which oil|how much oil|oil used|is oil used|oil quantity|does it have oil|ಎಣ್ಣೆ)\b/i.test(lower)) {
      const oilType = getField('Oil Type', 'oilType', 'None');
      const oilQty = getField('Oil Quantity', 'oilQuantity', '0 ml');

      if (isKn) {
        return {
          reply: `${name} ನಲ್ಲಿ ಬಳಸುವ ಎಣ್ಣೆ: ${oilType} (ಪ್ರಮಾಣ: ${oilQty}).`,
          toolCalled: 'getFoodOilDetails'
        };
      }
      return {
        reply: `Oil details for ${name}: ${oilType} (Quantity: ${oilQty}).`,
        toolCalled: 'getFoodOilDetails'
      };
    }

    // 9. SALT USED & QUANTITY
    if (/\b(contain salt|does it have salt|is salt used|how much salt|salt quantity|salt used|ಉಪ್ಪು)\b/i.test(lower)) {
      const saltUsed = getField('Salt Used', 'saltUsed', 'Yes');
      const saltQty = getField('Salt Quantity', 'saltQuantity', '1.5 g');

      if (isKn) {
        return {
          reply: `${name} ನಲ್ಲಿ ಉಪ್ಪಿನ ಬಳಕೆ: ${saltUsed} (ಪ್ರಮಾಣ: ${saltQty}).`,
          toolCalled: 'getFoodSaltDetails'
        };
      }
      return {
        reply: `Salt in ${name}: Salt used: ${saltUsed} (Quantity: ${saltQty}).`,
        toolCalled: 'getFoodSaltDetails'
      };
    }

    // 10. SUGAR USED & QUANTITY
    if (/\b(contain sugar|does it have sugar|is sugar added|how much sugar|sugar quantity|sugar used|ಸಕ್ಕರೆ)\b/i.test(lower)) {
      const sugarUsed = getField('Sugar Used', 'sugarUsed', 'No');
      const sugarQty = getField('Sugar Quantity', 'sugarQuantity', '0 g');

      if (isKn) {
        return {
          reply: `${name} ನಲ್ಲಿ ಸಕ್ಕರೆಯ ಬಳಕೆ: ${sugarUsed} (ಸಕ್ಕರೆ ಪ್ರಮಾಣ: ${sugarQty}).`,
          toolCalled: 'getFoodSugarDetails'
        };
      }
      return {
        reply: `Sugar in ${name}: Sugar added: ${sugarUsed} (Quantity: ${sugarQty}).`,
        toolCalled: 'getFoodSugarDetails'
      };
    }

    // 11. MASALA
    if (/\b(contain masala|does it use masala|what masala|homemade masala|spice blend|spices|ಮಸಾಲೆ)\b/i.test(lower)) {
      const masalaUsed = getField('Masala Used', 'masalaUsed', 'No');
      const masalaIngredients = getField('Masala Ingredients', 'masalaIngredients', 'Not applicable');

      if (isKn) {
        return {
          reply: `${name} ಮಸಾಲೆ ವಿವರ: ${masalaUsed}. ಪದಾರ್ಥಗಳು: ${Array.isArray(masalaIngredients) ? masalaIngredients.join(', ') : masalaIngredients}.`,
          toolCalled: 'getFoodMasalaDetails'
        };
      }
      return {
        reply: `Masala used in ${name}: ${masalaUsed}. Ingredients: ${Array.isArray(masalaIngredients) ? masalaIngredients.join(', ') : masalaIngredients}.`,
        toolCalled: 'getFoodMasalaDetails'
      };
    }

    // 12. RAW MATERIALS & SOURCING
    if (/\b(raw material|raw materials|quality of raw materials|where (do you source|are raw materials sourced)|supplier|ಕಚ್ಚಾ ವಸ್ತು)\b/i.test(lower)) {
      const details = getField('Raw Material Details', 'rawMaterialDetails');
      const quality = getField('Raw Material Quality', 'rawMaterialQuality');
      const source = getField('Raw Material Source', 'rawMaterialSupplier');

      if (isKn) {
        return {
          reply: `${name} ಕಚ್ಚಾ ವಸ್ತುಗಳ ವಿವರ: ${details}. ಗುಣಮಟ್ಟ: ${quality}. ಮೂಲ: ${source}.`,
          toolCalled: 'getFoodSourcingDetails'
        };
      }
      return {
        reply: `Raw materials for ${name}: ${details}. Quality: ${quality}. Source/Supplier: ${source}.`,
        toolCalled: 'getFoodSourcingDetails'
      };
    }

    // 13. FRESHNESS & PREPARATION DATE
    if (/\b(fresh|freshly prepared|is (this|it) fresh|when was it (made|prepared|cooked)|preparation date|ತಾಜಾ)\b/i.test(lower)) {
      const fresh = getField('Freshly Prepared', 'freshlyPrepared', 'Yes');
      const schedule = getField('Preparation Date', 'preparationDateTime', 'Prepared fresh daily');
      const bestBefore = getField('Best Before', 'bestBeforeDateTime', 'Best consumed fresh');

      if (isKn) {
        return {
          reply: `${name} ತಾಜಾತನದ ಮಾಹಿತಿ: ${fresh}. ತಯಾರಿ ವಿವರ: ${schedule}. ಉತ್ತಮ ಬಳಕೆ: ${bestBefore}.`,
          toolCalled: 'getFoodFreshnessDetails'
        };
      }
      return {
        reply: `Freshness information for ${name}: Freshly prepared: ${fresh}. Schedule: ${schedule}. Best before: ${bestBefore}.`,
        toolCalled: 'getFoodFreshnessDetails'
      };
    }

    // 14 & 15. SERVING SIZE & NET QUANTITY
    if (/\b(serving size|how much is one serving|how much (food )?do i get|net quantity|number of portions|portion size|ಸರ್ವಿಂಗ್ ಗಾತ್ರ|ಪ್ರಮಾಣ)\b/i.test(lower)) {
      const serving = getField('Serving Size', 'servingSize');
      const net = getField('Net Quantity', 'netQuantity');

      if (isKn) {
        return {
          reply: `${name} ಸರ್ವಿಂಗ್ ಗಾತ್ರ: ${serving} (ನೆಟ್ ಪ್ರಮಾಣ: ${net}).`,
          toolCalled: 'getFoodServingSize'
        };
      }
      return {
        reply: `Serving size for ${name}: ${serving} (Net quantity: ${net}).`,
        toolCalled: 'getFoodServingSize'
      };
    }

    // 16. NUTRITION (CALORIES, PROTEIN, CARBS, FIBRE, ETC.)
    if (/\b(how many calories|calories|how much protein|protein|carbohydrates|carbs|dietary fibre|fibre|fat|calcium|iron|sodium|nutrition|nutritional)\b|(ಪೌಷ್ಟಿಕಾಂಶ|ಕ್ಯಾಲೋರಿ|ಪ್ರೋಟೀನ್)/i.test(lower)) {
      const calories = ds ? ds["Calories"] : `${product.calories} kcal`;
      const protein = ds ? ds["Protein"] : (product.protein || 'N/A');
      const carbs = ds ? ds["Carbohydrates"] : (product.carbohydrates || 'N/A');
      const fat = ds ? ds["Fat"] : (product.fat || 'N/A');
      const fibre = ds ? ds["Dietary Fibre"] : (product.dietaryFibre || 'N/A');
      const calcium = ds ? ds["Calcium"] : (product.calcium || 'N/A');
      const iron = ds ? ds["Iron"] : (product.iron || 'N/A');

      if (isKn) {
        return {
          reply: `${name} ಪೌಷ್ಟಿಕಾಂಶ ಮಾಹಿತಿ: ಕ್ಯಾಲೋರಿ: ${calories}, ಪ್ರೋಟೀನ್: ${protein}, ಕಾರ್ಬೋಹೈಡ್ರೇಟ್ಸ್: ${carbs}, ಕೊಬ್ಬು: ${fat}, ನಾರಿನಂಶ: ${fibre}, ಕ್ಯಾಲ್ಸಿಯಂ: ${calcium}, ಕಬ್ಬಿಣಾಂಶ: ${iron}.`,
          toolCalled: 'getFoodNutritionalFacts'
        };
      }
      return {
        reply: `Nutritional facts for ${name}: Calories: ${calories}, Protein: ${protein}, Carbohydrates: ${carbs}, Fat: ${fat}, Dietary Fibre: ${fibre}, Calcium: ${calcium}, Iron: ${iron}. (Estimated nutritional reference).`,
        toolCalled: 'getFoodNutritionalFacts'
      };
    }

    // 17. ALLERGENS
    if (/\b(allergens|contain allergens|what allergens|allergies|allergic|ಅಲರ್ಜಿ)\b/i.test(lower)) {
      const allergens = getField('Allergens', 'allergens');
      const contains = getField('Contains', 'contains', 'None reported');
      const mayContain = getField('May Contain', 'mayContain', 'Cross-contact depends on preparation area');

      if (isKn) {
        return {
          reply: `${name} ಅಲರ್ಜಿ ಮಾಹಿತಿ: ${allergens}. ಒಳಗೊಂಡಿದೆ: ${contains}. ಕ್ರಾಸ್-ಕಾಂಟ್ಯಾಕ್ಟ್: ${mayContain}.`,
          toolCalled: 'getFoodAllergens'
        };
      }
      return {
        reply: `Allergen information for ${name}: ${allergens}. Contains: ${contains}. May contain: ${mayContain}.`,
        toolCalled: 'getFoodAllergens'
      };
    }

    // 18. VEGETARIAN / VEGAN / DAIRY / GLUTEN / NUTS
    if (/\b(vegetarian|vegan|non-veg|dairy|milk|gluten|gluten-free|contain gluten|nuts|peanuts|ಸಸ್ಯಾಹಾರಿ|ವೀಗನ್|ಹಾಲು)\b/i.test(lower)) {
      const isVeg = getField('Vegetarian Status', 'vegNonVeg', 'Yes');
      const isVegan = getField('Vegan Status', 'veganStatus', 'Yes');
      const dairy = getField('Dairy', 'dairy', 'No');
      const gluten = getField('Gluten', 'gluten', 'No');
      const nuts = getField('Nuts', 'nuts', 'No');
      const peanuts = getField('Peanuts', 'peanuts', 'No');

      if (/\b(dairy|milk)\b/i.test(lower)) {
        const replyText = dairy === 'Yes' || /dairy/i.test(dairy)
          ? `${name} contains dairy/milk.`
          : `${name} does not contain dairy or milk in its standard recipe.`;
        const replyKn = dairy === 'Yes' || /dairy/i.test(dairy)
          ? `${name} ನಲ್ಲಿ ಹಾಲು/ಡೈರಿ ಪದಾರ್ಥಗಳಿವೆ.`
          : `${name} ನಲ್ಲಿ ಹಾಲು ಅಥವಾ ಡೈರಿ ಪದಾರ್ಥಗಳಿಲ್ಲ.`;
        return { reply: isKn ? replyKn : replyText, toolCalled: 'getFoodDietaryStatus' };
      }

      if (/\b(vegan)\b/i.test(lower)) {
        const replyText = isVegan === 'Yes' || /vegan/i.test(isVegan)
          ? `Yes, ${name} is 100% vegan in its standard recipe.`
          : `No, ${name} is not vegan (contains dairy or animal-derived ingredients).`;
        const replyKn = isVegan === 'Yes' || /vegan/i.test(isVegan)
          ? `ಹೌದು, ${name} 100% ವೀಗನ್ ಆಗಿದೆ.`
          : `ಇಲ್ಲ, ${name} ವೀಗನ್ ಅಲ್ಲ.`;
        return { reply: isKn ? replyKn : replyText, toolCalled: 'getFoodDietaryStatus' };
      }

      if (/\b(gluten)\b/i.test(lower)) {
        const replyText = gluten === 'Yes' || /wheat/i.test(gluten)
          ? `${name} contains gluten (derived from wheat/semolina).`
          : `${name} has no gluten-containing ingredients in the standard recipe.`;
        const replyKn = gluten === 'Yes' || /wheat/i.test(gluten)
          ? `${name} ನಲ್ಲಿ ಗ್ಲುಟನ್ (ಗೋಧಿ/ರವೆ) ಇದೆ.`
          : `${name} ನೈಸರ್ಗಿಕವಾಗಿ ಗ್ಲುಟನ್-ಮುಕ್ತವಾಗಿದೆ.`;
        return { reply: isKn ? replyKn : replyText, toolCalled: 'getFoodDietaryStatus' };
      }

      if (isKn) {
        return {
          reply: `${name} ಡಯೆಟರಿ ಮಾಹಿತಿ: ಸಸ್ಯಾಹಾರಿ: ${isVeg}, ವೀಗನ್: ${isVegan}, ಹಾಲು/ಡೈರಿ: ${dairy}, ಗ್ಲುಟನ್: ${gluten}, ಕಡಲೆಕಾಯಿ: ${peanuts}.`,
          toolCalled: 'getFoodDietaryStatus'
        };
      }
      return {
        reply: `Dietary information for ${name}: Vegetarian: ${isVeg}, Vegan: ${isVegan}, Dairy: ${dairy}, Gluten: ${gluten}, Peanuts: ${peanuts}.`,
        toolCalled: 'getFoodDietaryStatus'
      };
    }

    // 19. STORAGE & REFRIGERATION
    if (/\b(how should i store|how to store|need refrigeration|does it need refrigeration|storage instructions|ಶೇಖರಣೆ)\b/i.test(lower)) {
      const storage = getField('Storage Instructions', 'storageInstructions');
      const refrig = getField('Refrigeration Required', 'refrigerationRequired', 'Store procedure dependent');

      if (isKn) {
        return {
          reply: `${name} ಶೇಖರಣಾ ಸೂಚನೆ: ${storage}. ರೆಫ್ರಿಜರೇಷನ್: ${refrig}.`,
          toolCalled: 'getFoodStorageInstructions'
        };
      }
      return {
        reply: `Storage instructions for ${name}: ${storage}. Refrigeration required: ${refrig}.`,
        toolCalled: 'getFoodStorageInstructions'
      };
    }

    // 20. SHELF LIFE
    if (/\b(how long does it last|what is the shelf life|shelf life|best before|ಎಷ್ಟು ದಿನ ಬಾಳಿಕೆ)\b/i.test(lower)) {
      const shelfLife = getField('Shelf Life', 'shelfLife');
      const bestBefore = getField('Best Before', 'bestBeforeDateTime');

      if (isKn) {
        return {
          reply: `${name} ಶೆಲ್ಫ್ ಲೈಫ್: ${shelfLife}. ಉತ್ತಮ ಬಳಕೆ ಅವಧಿ: ${bestBefore}.`,
          toolCalled: 'getFoodShelfLife'
        };
      }
      return {
        reply: `Shelf life for ${name}: ${shelfLife}. Best before: ${bestBefore}.`,
        toolCalled: 'getFoodShelfLife'
      };
    }

    // 21. PACKAGING
    if (/\b(how is it packaged|what packaging|packaging material|food-grade packaging|ಪ್ಯಾಕೇಜಿಂಗ್)\b/i.test(lower)) {
      const packType = getField('Packaging Type', 'packagingType');
      const packMat = getField('Packaging Material', 'packagingMaterial');

      if (isKn) {
        return {
          reply: `${name} ಪ್ಯಾಕೇಜಿಂಗ್ ವಿವರ: ${packType}. ಸಾಮಗ್ರಿ: ${packMat}. ಆಹಾರ-ದರ್ಜೆಯ ಸುರಕ್ಷಿತ ಪ್ಯಾಕಿಂಗ್.`,
          toolCalled: 'getFoodPackagingDetails'
        };
      }
      return {
        reply: `Packaging for ${name}: Type: ${packType}. Material: ${packMat}. Clean, food-contact grade packaging.`,
        toolCalled: 'getFoodPackagingDetails'
      };
    }

    // 22. REHEATING INSTRUCTIONS
    if (/\b(reheat|reheating|how to reheat|can i reheat|warm up|ಬಿಸಿ ಮಾಡುವುದು)\b/i.test(lower)) {
      const reheat = getField('Recommended Serving Method', 'reheatingInstructions', `${name} is best consumed fresh and hot. If needed, steam lightly for 2-3 minutes.`);
      if (isKn) {
        return {
          reply: `${name} ಮರುಬಿಸಿ ಮಾಡುವ ವಿಧಾನ: ${reheat}`,
          toolCalled: 'getFoodReheatingInstructions'
        };
      }
      return {
        reply: `Reheating instructions for ${name}: ${reheat}`,
        toolCalled: 'getFoodReheatingInstructions'
      };
    }

    // 23. SERVING SUGGESTION / HOW TO EAT
    if (/\b(how to eat|how should i eat|serving method|serving suggestion|serve with|how is it served|ಹೇಗೆ ಸೇವಿಸುವುದು)\b/i.test(lower)) {
      const serving = getField('Recommended Serving Method', 'recommendedServingMethod', 'Serve warm with authentic accompaniments.');
      if (isKn) {
        return {
          reply: `${name} ಸೇವಿಸುವ ವಿಧಾನ / ಸಲಹೆ: ${serving}`,
          toolCalled: 'getFoodServingSuggestion'
        };
      }
      return {
        reply: `Serving suggestion for ${name}: ${serving}`,
        toolCalled: 'getFoodServingSuggestion'
      };
    }

    // 24. SPICE LEVEL
    if (/\b(spice level|how spicy|is it spicy|spiciness|ಖಾರ|ಖಾರವಾಗಿದೆಯೇ)\b/i.test(lower)) {
      const spice = getField('Spice Level', 'spiceLevel', 'Mild to medium authentic spices');
      if (isKn) {
        return {
          reply: `${name} ಖಾರದ ಪ್ರಮಾಣ (Spice Level): ${spice}.`,
          toolCalled: 'getFoodSpiceLevel'
        };
      }
      return {
        reply: `Spice level for ${name}: ${spice}.`,
        toolCalled: 'getFoodSpiceLevel'
      };
    }

    // 26. DELIVERY
    if (/\b(can you deliver|when can .*?be delivered|delivery availability|delivery charge|serviceable areas|ಡೆಲಿವರಿ)\b/i.test(lower)) {
      const deliv = getField('Delivery Availability', 'deliveryAvailability', 'Store dependent');
      const time = getField('Estimated Delivery Time', 'deliveryDays', 'Same-day delivery (within 45-60 mins)');
      const charge = product.deliveryCharges !== undefined ? `₹${product.deliveryCharges}` : '₹40';

      if (isKn) {
        return {
          reply: `${name} ಡೆಲಿವರಿ ಲಭ್ಯವಿದೆ (${deliv}). ಅಂದಾಜು ಸಮಯ: ${time}. ಡೆಲಿವರಿ ಶುಲ್ಕ: ${charge}.`,
          toolCalled: 'getFoodDeliveryDetails'
        };
      }
      return {
        reply: `Delivery is available for ${name} (${deliv}). Estimated time: ${time}. Delivery fee: ${charge}.`,
        toolCalled: 'getFoodDeliveryDetails'
      };
    }

    // 27. ORDER QUANTITY
    if (/\b(minimum order quantity|maximum order quantity|how many can i order|order limit)\b/i.test(lower)) {
      const min = getField('Minimum Order Quantity', 'minOrderQty', 1);
      const max = getField('Maximum Order Quantity', 'maxOrderQty', 10);

      if (isKn) {
        return {
          reply: `${name} ಕನಿಷ್ಠ ಆರ್ಡರ್ ಪ್ರಮಾಣ: ${min} ಯೂನಿಟ್, ಗರಿಷ್ಠ: ${max} ಯೂನಿಟ್‌ಗಳು.`,
          toolCalled: 'getFoodOrderQuantity'
        };
      }
      return {
        reply: `For ${name}, the minimum order quantity is ${min} and maximum is ${max} servings per order.`,
        toolCalled: 'getFoodOrderQuantity'
      };
    }

    // 28. CANCELLATION
    if (/\b(cancel my order|cancellation policy|can i cancel)\b/i.test(lower)) {
      const policy = getField('Cancellation Policy', 'cancellationPolicy', 'Orders can be cancelled within 5 minutes of placement before cooking begins.');
      if (isKn) {
        return {
          reply: `ರದ್ದತಿ ನೀತಿ (Cancellation Policy): ${policy}`,
          toolCalled: 'getFoodCancellationPolicy'
        };
      }
      return {
        reply: `Cancellation policy for ${name}: ${policy}`,
        toolCalled: 'getFoodCancellationPolicy'
      };
    }

    // 29. RETURN & REPLACEMENT
    if (/\b(can i return|return policy|replacement policy|replace)\b/i.test(lower)) {
      const ret = getField('Return Policy', 'returnPolicy', 'Prepared food is non-returnable. Instant replacement or refund provided for damaged or quality issues upon delivery.');
      if (isKn) {
        return {
          reply: `ರಿಟರ್ನ್ / ಬದಲಿ ನೀತಿ (Return/Replacement): ${ret}`,
          toolCalled: 'getFoodReturnPolicy'
        };
      }
      return {
        reply: `Return & replacement policy for ${name}: ${ret}`,
        toolCalled: 'getFoodReturnPolicy'
      };
    }

    // 30. FOOD SAFETY & HYGIENE
    if (/\b(hygiene|hygienic|food safety|safety handled|prepared hygienically|ಸ್ವಚ್ಛತೆ|ಸುರಕ್ಷತೆ)\b/i.test(lower)) {
      const safety = getField('Food Safety Information', 'foodSafetyHygiene');
      const hygiene = getField('Hygiene Information', 'hygieneInfo', 'Sanitized preparation surface and clean utensils used.');

      if (isKn) {
        return {
          reply: `${name} ಆಹಾರ ಸುರಕ್ಷತೆ: ${safety}. ನೈರ್ಮಲ್ಯ: ${hygiene}.`,
          toolCalled: 'getFoodSafetyDetails'
        };
      }
      return {
        reply: `Food safety for ${name}: ${safety}. Hygiene: ${hygiene}.`,
        toolCalled: 'getFoodSafetyDetails'
      };
    }

    // 31. WHAT MAKES IT DIFFERENT / GENERAL INFORMATION
    if (/\b(what makes .*?(different|special|unique)|what makes (it|this|the dish|the food)|why is it special|what is special|speciality|specialty|traditional info|traditional preparation|tell me more|more information|ಯಾಕೆ ವಿಶೇಷ|ಏನು ವಿಶೇಷ)\b/i.test(lower)) {
      const trad = getField('Traditional Preparation Information', 'traditionalPreparationInfo');
      const desc = getField('Description', 'description');

      if (isKn) {
        return {
          reply: `${name} ಸಾಂಪ್ರದಾಯಿಕ ವೈಶಿಷ್ಟ್ಯ: ${trad || desc}.`,
          toolCalled: 'getFoodTraditionalInfo'
        };
      }
      return {
        reply: `Special information about ${name}: ${trad || desc}.`,
        toolCalled: 'getFoodTraditionalInfo'
      };
    }

    return null;
  }
}
