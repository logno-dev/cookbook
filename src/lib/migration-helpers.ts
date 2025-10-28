import { RecipeIngredient, RecipeInstruction } from './recipe-service';

export function migrateIngredientsFromString(oldIngredients: string[]): RecipeIngredient[] {
  return oldIngredients.map(ingredient => {
    // Use the same parsing logic as the scraper
    const cleanStr = ingredient.trim();
    
    const units = [
      'cup', 'cups', 'c',
      'tablespoon', 'tablespoons', 'tbsp', 'tbs', 'T',
      'teaspoon', 'teaspoons', 'tsp', 't',
      'pound', 'pounds', 'lb', 'lbs',
      'ounce', 'ounces', 'oz',
      'gram', 'grams', 'g',
      'kilogram', 'kilograms', 'kg',
      'liter', 'liters', 'l',
      'milliliter', 'milliliters', 'ml',
      'pint', 'pints', 'pt',
      'quart', 'quarts', 'qt',
      'gallon', 'gallons', 'gal',
      'inch', 'inches', 'in',
      'piece', 'pieces', 'pc',
      'slice', 'slices',
      'clove', 'cloves',
      'can', 'cans',
      'bottle', 'bottles',
      'package', 'packages', 'pkg',
      'bunch', 'bunches',
      'head', 'heads',
      'large', 'medium', 'small'
    ];
    
    const quantityUnitPattern = new RegExp(
      `^([\\d\\s\\/\\-\\.,]+)\\s*(${units.join('|')})\\s+(.+)$`, 'i'
    );
    
    const quantityUnitMatch = cleanStr.match(quantityUnitPattern);
    if (quantityUnitMatch) {
      const [, quantity, unit, ingredientName] = quantityUnitMatch;
      return {
        quantity: quantity.trim(),
        unit: unit.toLowerCase(),
        ingredient: ingredientName.trim()
      };
    }
    
    const quantityOnlyPattern = /^([\d\s\/\-\.,]+)\s+(.+)$/;
    const quantityOnlyMatch = cleanStr.match(quantityOnlyPattern);
    if (quantityOnlyMatch) {
      const [, quantity, ingredientName] = quantityOnlyMatch;
      return {
        quantity: quantity.trim(),
        ingredient: ingredientName.trim()
      };
    }
    
    return {
      ingredient: cleanStr
    };
  });
}

export function migrateInstructionsFromString(oldInstructions: string[]): RecipeInstruction[] {
  return oldInstructions.map((instruction, index) => {
    const cleanStr = instruction.trim();
    
    const timeMatch = cleanStr.match(/(\d+)\s*(minutes?|mins?|hours?|hrs?)/i);
    const time = timeMatch ? 
      (timeMatch[2].toLowerCase().includes('hour') ? 
        parseInt(timeMatch[1]) * 60 : parseInt(timeMatch[1])) : undefined;
    
    const tempMatch = cleanStr.match(/(\d+)\s*°?\s*([CF])/i);
    const temperature = tempMatch ? `${tempMatch[1]}°${tempMatch[2].toUpperCase()}` : undefined;
    
    return {
      step: index + 1,
      instruction: cleanStr,
      time,
      temperature
    };
  });
}

export function isLegacyRecipeData(data: any): boolean {
  return Array.isArray(data.ingredients) && 
         data.ingredients.length > 0 && 
         typeof data.ingredients[0] === 'string';
}