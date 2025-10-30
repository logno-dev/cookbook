import { db } from '../db';
import { groceryLists, groceryListItems, groceryListRecipes, recipes, recipeVariants } from '../db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { parseFraction, parseFractionForShopping } from './fraction-utils';
import Fraction from 'fraction.js';

// Helper function to normalize units (handle plurals and common variations)
function normalizeUnit(unit?: string): string | undefined {
  if (!unit) return undefined;
  
  const normalized = unit.toLowerCase().trim();
  
  // Common unit normalizations (singular form)
  const unitMap: { [key: string]: string } = {
    // Volume
    'teaspoon': 'teaspoon',
    'teaspoons': 'teaspoon',
    'tsp': 'teaspoon',
    'tsps': 'teaspoon',
    'tablespoon': 'tablespoon',
    'tablespoons': 'tablespoon',
    'tbsp': 'tablespoon',
    'tbsps': 'tablespoon',
    'cup': 'cup',
    'cups': 'cup',
    'c': 'cup',
    'pint': 'pint',
    'pints': 'pint',
    'pt': 'pint',
    'pts': 'pint',
    'quart': 'quart',
    'quarts': 'quart',
    'qt': 'quart',
    'qts': 'quart',
    'gallon': 'gallon',
    'gallons': 'gallon',
    'gal': 'gallon',
    'gals': 'gallon',
    'fluid ounce': 'fluid ounce',
    'fluid ounces': 'fluid ounce',
    'fl oz': 'fluid ounce',
    'fl ozs': 'fluid ounce',
    'milliliter': 'milliliter',
    'milliliters': 'milliliter',
    'ml': 'milliliter',
    'liter': 'liter',
    'liters': 'liter',
    'l': 'liter',
    
    // Weight
    'ounce': 'ounce',
    'ounces': 'ounce',
    'oz': 'ounce',
    'ozs': 'ounce',
    'pound': 'pound',
    'pounds': 'pound',
    'lb': 'pound',
    'lbs': 'pound',
    'gram': 'gram',
    'grams': 'gram',
    'g': 'gram',
    'kilogram': 'kilogram',
    'kilograms': 'kilogram',
    'kg': 'kilogram',
    
    // Count/Other
    'piece': 'piece',
    'pieces': 'piece',
    'pc': 'piece',
    'pcs': 'piece',
    'slice': 'slice',
    'slices': 'slice',
    'clove': 'clove',
    'cloves': 'clove',
    'head': 'head',
    'heads': 'head',
    'bunch': 'bunch',
    'bunches': 'bunch',
    'package': 'package',
    'packages': 'package',
    'pkg': 'package',
    'pkgs': 'package',
    'can': 'can',
    'cans': 'can',
    'jar': 'jar',
    'jars': 'jar',
    'bottle': 'bottle',
    'bottles': 'bottle',
    'bag': 'bag',
    'bags': 'bag',
    'box': 'box',
    'boxes': 'box',
    'container': 'container',
    'containers': 'container',
    'pinch': 'pinch',
    'pinches': 'pinch',
    'dash': 'dash',
    'dashes': 'dash',
    'drop': 'drop',
    'drops': 'drop',
  };
  
  return unitMap[normalized] || normalized;
}

// Helper function to convert decimal back to fraction string using fraction.js library
function decimalToFractionString(decimal: number): string {
  try {
    // Use Fraction.js to handle the conversion properly
    const fraction = new Fraction(decimal);
    
    // Use the built-in toFraction method with mixed number formatting
    return fraction.toFraction(true); // true enables mixed number format
  } catch (error) {
    // Fallback: if fraction.js fails for some reason, round to 1 decimal
    const rounded = Math.round(decimal * 10) / 10;
    if (rounded === Math.floor(rounded)) {
      return Math.floor(rounded).toString();
    }
    return rounded.toString();
  }
}

export interface GroceryList {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroceryListItem {
  id: string;
  groceryListId: string;
  name: string;
  quantity?: string;
  unit?: string;
  notes?: string;
  isCompleted: boolean;
  category?: string;
  order: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface GroceryListRecipe {
  id: string;
  groceryListId: string;
  recipeId: string;
  variantId?: string;
  multiplier: number;
  addedAt: Date;
  recipe?: {
    title: string;
    ingredients: Array<{
      quantity?: string;
      unit?: string;
      ingredient: string;
      notes?: string;
    }>;
  };
  variant?: {
    name: string;
    ingredients?: Array<{
      quantity?: string;
      unit?: string;
      ingredient: string;
      notes?: string;
    }>;
  };
}

export interface ParsedIngredient {
  originalText: string;
  quantity?: number;
  unit?: string;
  ingredient: string;
  notes?: string;
}

export interface IngredientMatch {
  ingredient: ParsedIngredient;
  existingItem?: GroceryListItem;
  confidence: number;
}

export class GroceryListService {
  static async createGroceryList(userId: string, name: string, description?: string): Promise<GroceryList> {
    const id = uuidv4();
    const now = new Date();
    
    await db.insert(groceryLists).values({
      id,
      userId,
      name,
      description,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      userId,
      name,
      description,
      createdAt: now,
      updatedAt: now,
    };
  }

  static async getUserGroceryLists(userId: string): Promise<GroceryList[]> {
    return await db.select()
      .from(groceryLists)
      .where(eq(groceryLists.userId, userId))
      .orderBy(desc(groceryLists.updatedAt));
  }

  static async getGroceryList(id: string, userId: string): Promise<GroceryList | null> {
    const [groceryList] = await db.select()
      .from(groceryLists)
      .where(and(eq(groceryLists.id, id), eq(groceryLists.userId, userId)));

    return groceryList || null;
  }

  static async updateGroceryList(id: string, userId: string, updates: Partial<Pick<GroceryList, 'name' | 'description'>>): Promise<GroceryList | null> {
    const [updated] = await db.update(groceryLists)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(groceryLists.id, id), eq(groceryLists.userId, userId)))
      .returning();

    return updated || null;
  }

  static async deleteGroceryList(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(groceryLists)
      .where(and(eq(groceryLists.id, id), eq(groceryLists.userId, userId)));

    return result.rowsAffected > 0;
  }

  static async getGroceryListItems(groceryListId: string): Promise<GroceryListItem[]> {
    return await db.select()
      .from(groceryListItems)
      .where(eq(groceryListItems.groceryListId, groceryListId))
      .orderBy(asc(groceryListItems.order), asc(groceryListItems.createdAt));
  }

  static async addGroceryListItem(groceryListId: string, item: Omit<GroceryListItem, 'id' | 'groceryListId' | 'createdAt' | 'completedAt'>): Promise<GroceryListItem> {
    const id = uuidv4();
    const now = new Date();

    await db.insert(groceryListItems).values({
      id,
      groceryListId,
      ...item,
      createdAt: now,
    });

    return {
      id,
      groceryListId,
      ...item,
      createdAt: now,
      completedAt: undefined,
    };
  }

  static async updateGroceryListItem(itemId: string, updates: Partial<Omit<GroceryListItem, 'id' | 'groceryListId' | 'createdAt'>>): Promise<GroceryListItem | null> {
    const updateData: any = { ...updates };
    
    if (updates.isCompleted !== undefined) {
      updateData.completedAt = updates.isCompleted ? new Date() : null;
    }

    const [updated] = await db.update(groceryListItems)
      .set(updateData)
      .where(eq(groceryListItems.id, itemId))
      .returning();

    return updated || null;
  }

  static async deleteGroceryListItem(itemId: string): Promise<boolean> {
    const result = await db.delete(groceryListItems)
      .where(eq(groceryListItems.id, itemId));

    return result.rowsAffected > 0;
  }

  static async addRecipeToGroceryList(groceryListId: string, recipeId: string, variantId?: string, multiplier: number = 1): Promise<GroceryListRecipe> {
    const id = uuidv4();
    const now = new Date();

    await db.insert(groceryListRecipes).values({
      id,
      groceryListId,
      recipeId,
      variantId,
      multiplier,
      addedAt: now,
    });

    return {
      id,
      groceryListId,
      recipeId,
      variantId,
      multiplier,
      addedAt: now,
    };
  }

  static async getGroceryListRecipes(groceryListId: string): Promise<GroceryListRecipe[]> {
    const results = await db.select({
      id: groceryListRecipes.id,
      groceryListId: groceryListRecipes.groceryListId,
      recipeId: groceryListRecipes.recipeId,
      variantId: groceryListRecipes.variantId,
      multiplier: groceryListRecipes.multiplier,
      addedAt: groceryListRecipes.addedAt,
      recipeTitle: recipes.title,
      recipeIngredients: recipes.ingredients,
      variantName: recipeVariants.name,
      variantIngredients: recipeVariants.ingredients,
    })
    .from(groceryListRecipes)
    .leftJoin(recipes, eq(groceryListRecipes.recipeId, recipes.id))
    .leftJoin(recipeVariants, eq(groceryListRecipes.variantId, recipeVariants.id))
    .where(eq(groceryListRecipes.groceryListId, groceryListId))
    .orderBy(desc(groceryListRecipes.addedAt));

    return results.map(row => ({
      id: row.id,
      groceryListId: row.groceryListId,
      recipeId: row.recipeId,
      variantId: row.variantId,
      multiplier: row.multiplier,
      addedAt: row.addedAt,
      recipe: row.recipeTitle ? {
        title: row.recipeTitle,
        ingredients: row.recipeIngredients || [],
      } : undefined,
      variant: row.variantName ? {
        name: row.variantName,
        ingredients: row.variantIngredients,
      } : undefined,
    }));
  }

  static async removeRecipeFromGroceryList(groceryListRecipeId: string): Promise<boolean> {
    const result = await db.delete(groceryListRecipes)
      .where(eq(groceryListRecipes.id, groceryListRecipeId));

    return result.rowsAffected > 0;
  }

  static parseIngredient(ingredientText: string): ParsedIngredient {
    const text = ingredientText.trim();
    
    // Regex patterns for parsing ingredients
    const patterns = [
      // Pattern: "2 cups flour, sifted" or "1/2 cup butter"
      /^(\d+(?:\s*\d+\/\d+|\.\d+)?|\d*\s*\d+\/\d+)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*?)\s+([^,]+?)(?:,\s*(.+))?$/,
      // Pattern: "2 cups flour" (no notes)
      /^(\d+(?:\s*\d+\/\d+|\.\d+)?|\d*\s*\d+\/\d+)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*?)\s+(.+)$/,
      // Pattern: "flour" (just ingredient name)
      /^([^,]+?)(?:,\s*(.+))?$/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (match.length >= 4 && match[1] && match[2]) {
          // Has quantity and unit
          const quantityStr = match[1].trim();
          const quantity = parseFraction(quantityStr);
          const unit = match[2].trim();
          const ingredient = match[3].trim();
          const notes = match[4]?.trim();

          return {
            originalText: text,
            quantity,
            unit,
            ingredient,
            notes,
          };
        } else if (match.length >= 3 && match[1]) {
          // Just ingredient (and maybe notes)
          const ingredient = match[1].trim();
          const notes = match[2]?.trim();

          return {
            originalText: text,
            ingredient,
            notes,
          };
        }
      }
    }

    // Fallback: treat entire text as ingredient name
    return {
      originalText: text,
      ingredient: text,
    };
  }

  static findIngredientMatches(
    parsedIngredients: ParsedIngredient[],
    existingItems: GroceryListItem[]
  ): IngredientMatch[] {
    return parsedIngredients.map(ingredient => {
      let bestMatch: GroceryListItem | undefined;
      let bestConfidence = 0;

      for (const item of existingItems) {
        const confidence = this.calculateIngredientSimilarity(
          ingredient.ingredient.toLowerCase(),
          item.name.toLowerCase()
        );

        if (confidence > bestConfidence && confidence > 0.6) {
          bestMatch = item;
          bestConfidence = confidence;
        }
      }

      return {
        ingredient,
        existingItem: bestMatch,
        confidence: bestConfidence,
      };
    });
  }

  static calculateIngredientSimilarity(a: string, b: string): number {
    // Normalize inputs - convert to lowercase and split into words
    const wordsA = a.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    const wordsB = b.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    
    // Check for exact matches
    if (a.toLowerCase() === b.toLowerCase()) return 1.0;
    
    // Check if one contains the other
    if (a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase())) return 0.9;
    
    // Define common food synonyms and related terms
    const synonymGroups = [
      ['milk', 'dairy', 'cream'],
      ['plant', 'vegan', 'non-dairy', 'alternative'],
      ['unsweetened', 'plain', 'natural'],
      ['soy', 'soya'],
      ['almond', 'almonds'],
      ['oat', 'oats'],
      ['coconut', 'coco'],
      ['rice', 'ricemilk'],
      ['cheese', 'cheddar', 'mozzarella', 'swiss', 'gouda'],
      ['butter', 'margarine'],
      ['sugar', 'sweetener', 'sweetened'],
      ['salt', 'sodium'],
      ['pepper', 'peppercorn'],
      ['onion', 'onions'],
      ['garlic', 'garlic powder'],
      ['tomato', 'tomatoes'],
      ['potato', 'potatoes'],
      ['carrot', 'carrots'],
      ['chicken', 'poultry'],
      ['beef', 'steak', 'ground beef'],
      ['pork', 'bacon', 'ham'],
      ['fish', 'salmon', 'tuna', 'cod'],
      ['bread', 'loaf', 'slice'],
      ['flour', 'all-purpose', 'wheat'],
      ['oil', 'olive oil', 'vegetable oil', 'canola'],
      ['vinegar', 'balsamic', 'white vinegar', 'apple cider vinegar']
    ];
    
    // Helper function to check if two words are synonyms
    const areSynonyms = (word1: string, word2: string): boolean => {
      return synonymGroups.some(group => 
        group.includes(word1) && group.includes(word2)
      );
    };
    
    // Find exact word matches and synonym matches
    let exactMatches = 0;
    let synonymMatches = 0;
    let totalScore = 0;
    
    for (const wordA of wordsA) {
      for (const wordB of wordsB) {
        if (wordA === wordB) {
          exactMatches++;
          // Give high weight to exact matches
          totalScore += 0.8;
        } else if (areSynonyms(wordA, wordB)) {
          synonymMatches++;
          // Give medium weight to synonym matches
          totalScore += 0.6;
        } else if (wordA.includes(wordB) || wordB.includes(wordA)) {
          // Give some credit for partial word matches
          totalScore += 0.3;
        }
      }
    }
    
    // If we have any exact word matches, boost the score significantly
    if (exactMatches > 0) {
      const maxWords = Math.max(wordsA.length, wordsB.length);
      const matchRatio = (exactMatches + (synonymMatches * 0.75)) / maxWords;
      
      // Ensure exact word matches result in at least 0.6 similarity
      const baseScore = Math.max(0.6, matchRatio);
      
      // Add bonus for multiple exact matches
      const bonus = exactMatches > 1 ? 0.1 : 0;
      
      return Math.min(1.0, baseScore + bonus);
    }
    
    // If we have synonym matches but no exact matches
    if (synonymMatches > 0) {
      const maxWords = Math.max(wordsA.length, wordsB.length);
      const matchRatio = synonymMatches / maxWords;
      return Math.max(0.5, matchRatio * 0.8); // At least 0.5 for synonym matches
    }
    
    // Fallback to original algorithm for partial matches
    const commonWords = wordsA.filter(wordA => 
      wordsB.some(wordB => wordA.includes(wordB) || wordB.includes(wordA))
    );
    
    if (commonWords.length > 0) {
      const maxWords = Math.max(wordsA.length, wordsB.length);
      return Math.min(0.5, commonWords.length / maxWords); // Cap at 0.5 for partial matches
    }
    
    // Levenshtein distance based similarity as last resort
    const distance = this.levenshteinDistance(a.toLowerCase(), b.toLowerCase());
    const maxLength = Math.max(a.length, b.length);
    
    return Math.max(0, Math.min(0.4, 1 - distance / maxLength)); // Cap at 0.4 for character similarity
  }

  static levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[b.length][a.length];
  }

  static combineQuantities(quantity1?: string, quantity2?: string, unit1?: string, unit2?: string): { quantity: string; unit?: string } {
    if (!quantity1 && !quantity2) {
      return { quantity: '1' };
    }

    // For grocery shopping, use maximum values from ranges to ensure we have enough
    const q1 = quantity1 ? parseFractionForShopping(quantity1) : 0;
    const q2 = quantity2 ? parseFractionForShopping(quantity2) : 0;

    // Normalize units to handle plurals and variations
    const normalizedUnit1 = normalizeUnit(unit1);
    const normalizedUnit2 = normalizeUnit(unit2);

    // Use the first unit if available, otherwise the second (prefer original form)
    const unit = unit1 || unit2;

    // If normalized units don't match, we can't combine numerically
    if (normalizedUnit1 && normalizedUnit2 && normalizedUnit1 !== normalizedUnit2) {
      // If we can parse both quantities, show them cleanly, otherwise fall back to original strings
      const q1Str = q1 > 0 ? decimalToFractionString(q1) : (quantity1 || '');
      const q2Str = q2 > 0 ? decimalToFractionString(q2) : (quantity2 || '');
      
      return {
        quantity: `${q1Str} ${unit1 || ''} + ${q2Str} ${unit2 || ''}`.trim(),
        unit: undefined,
      };
    }

    const total = q1 + q2;
    return {
      quantity: decimalToFractionString(total),
      unit,
    };
  }



  static async processRecipeIngredients(
    groceryListId: string,
    recipeIngredients: Array<{ quantity?: string; unit?: string; ingredient: string; notes?: string }>,
    multiplier: number = 1
  ): Promise<IngredientMatch[]> {
    // Parse all ingredients from the recipe
    const parsedIngredients = recipeIngredients.map(ing => {
      const parsed = this.parseIngredient(ing.ingredient);
      
      // Apply multiplier to quantity
      if (parsed.quantity && multiplier !== 1) {
        parsed.quantity = parsed.quantity * multiplier;
      }
      
      // Use the structured data from the recipe if available
      if (ing.quantity && ing.unit) {
        const adjustedQuantity = ing.quantity && multiplier !== 1 
          ? (parseFractionForShopping(ing.quantity) * multiplier).toString()
          : ing.quantity;
        
        return {
          originalText: `${adjustedQuantity} ${ing.unit} ${ing.ingredient}`,
          quantity: adjustedQuantity ? parseFractionForShopping(adjustedQuantity) : undefined,
          unit: ing.unit,
          ingredient: ing.ingredient,
          notes: ing.notes,
        };
      }
      
      return parsed;
    });

    // Get existing items in the grocery list
    const existingItems = await this.getGroceryListItems(groceryListId);

    // Find matches
    return this.findIngredientMatches(parsedIngredients, existingItems);
  }
}