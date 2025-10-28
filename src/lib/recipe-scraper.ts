import * as cheerio from 'cheerio';

export interface ScrapedIngredient {
  quantity?: string;
  unit?: string;
  ingredient: string;
  notes?: string;
}

export interface ScrapedInstruction {
  step: number;
  instruction: string;
  time?: number;
  temperature?: string;
}

export interface ScrapedRecipe {
  title: string;
  description?: string;
  ingredients: ScrapedIngredient[];
  instructions: ScrapedInstruction[];
  servings?: number;
  yield?: string;
  cookTime?: number;
  prepTime?: number;
  totalTime?: number;
  restTime?: number;
  imageUrl?: string;
  cuisine?: string;
  category?: string;
  diet?: string;
  difficulty?: string;
  sourceAuthor?: string;
  equipment?: string[];
  notes?: string;
  nutrition?: {
    calories?: number;
    protein?: string;
    carbohydrates?: string;
    fat?: string;
    saturatedFat?: string;
    cholesterol?: string;
    sodium?: string;
    fiber?: string;
    sugar?: string;
    servingSize?: string;
    servingsPerContainer?: number;
  };
}

function parseTimeToMinutes(timeStr: string): number | undefined {
  if (!timeStr) return undefined;
  
  const matches = timeStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (matches) {
    const hours = parseInt(matches[1] || '0');
    const minutes = parseInt(matches[2] || '0');
    return hours * 60 + minutes;
  }
  
  const hourMatch = timeStr.match(/(\d+)\s*h/i);
  const minuteMatch = timeStr.match(/(\d+)\s*m/i);
  
  let totalMinutes = 0;
  if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
  if (minuteMatch) totalMinutes += parseInt(minuteMatch[1]);
  
  return totalMinutes > 0 ? totalMinutes : undefined;
}

function parseIngredient(ingredientStr: string): ScrapedIngredient {
  const cleanStr = ingredientStr.trim();
  
  // Common units and their variations
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
  
  // Handle parenthetical notes first
  const notesMatch = cleanStr.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  let baseIngredient = cleanStr;
  let notes = '';
  
  if (notesMatch) {
    baseIngredient = notesMatch[1].trim();
    notes = notesMatch[2].trim();
  }
  
  // Try to match: quantity unit ingredient
  const quantityUnitPattern = new RegExp(
    `^([\\d\\s\\/\\-\\.,¼½¾⅓⅔⅛⅜⅝⅞]+)\\s*(${units.join('|')})\\s+(.+)$`, 'i'
  );
  
  const quantityUnitMatch = baseIngredient.match(quantityUnitPattern);
  if (quantityUnitMatch) {
    const [, quantity, unit, ingredient] = quantityUnitMatch;
    return {
      quantity: quantity.trim(),
      unit: unit.toLowerCase(),
      ingredient: ingredient.trim(),
      notes: notes || undefined
    };
  }
  
  // Try to match: quantity ingredient (no unit)
  const quantityOnlyPattern = /^([\d\s\/\-\.,¼½¾⅓⅔⅛⅜⅝⅞]+)\s+(.+)$/;
  const quantityOnlyMatch = baseIngredient.match(quantityOnlyPattern);
  if (quantityOnlyMatch) {
    const [, quantity, ingredient] = quantityOnlyMatch;
    return {
      quantity: quantity.trim(),
      ingredient: ingredient.trim(),
      notes: notes || undefined
    };
  }
  
  // No quantity found, return the whole string as ingredient
  return {
    ingredient: baseIngredient,
    notes: notes || undefined
  };
}

function parseInstruction(instructionStr: string, index: number): ScrapedInstruction {
  const cleanStr = instructionStr.trim();
  
  // Try to extract time mentions
  const timeMatch = cleanStr.match(/(\d+)\s*(minutes?|mins?|hours?|hrs?)/i);
  const time = timeMatch ? 
    (timeMatch[2].toLowerCase().includes('hour') ? 
      parseInt(timeMatch[1]) * 60 : parseInt(timeMatch[1])) : undefined;
  
  // Try to extract temperature mentions
  const tempMatch = cleanStr.match(/(\d+)\s*°?\s*([CF])/i);
  const temperature = tempMatch ? `${tempMatch[1]}°${tempMatch[2].toUpperCase()}` : undefined;
  
  return {
    step: index + 1,
    instruction: cleanStr,
    time,
    temperature
  };
}

function extractJsonLd($: cheerio.CheerioAPI): ScrapedRecipe | null {
  const jsonLdScripts = $('script[type="application/ld+json"]');
  
  for (let i = 0; i < jsonLdScripts.length; i++) {
    try {
      const content = $(jsonLdScripts[i]).html();
      if (!content) continue;
      
      const data = JSON.parse(content);
      
      // Handle @graph structure (common in WordPress/Yoast)
      let items = [];
      if (data['@graph']) {
        items = data['@graph'];
      } else if (Array.isArray(data)) {
        items = data;
      } else {
        items = [data];
      }
      
      for (const item of items) {
        if (item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
          const rawIngredients = Array.isArray(item.recipeIngredient) 
            ? item.recipeIngredient 
            : typeof item.recipeIngredient === 'string' 
              ? [item.recipeIngredient] 
              : [];
              
          const ingredients = rawIngredients
            .filter((ing: string) => ing.trim())
            .map((ing: string) => parseIngredient(ing));
              
          // Handle complex instruction structures (including HowToSection)
          const rawInstructions: string[] = [];
          if (Array.isArray(item.recipeInstructions)) {
            for (const inst of item.recipeInstructions) {
              if (typeof inst === 'string') {
                rawInstructions.push(inst);
              } else if (inst['@type'] === 'HowToSection' && inst.itemListElement) {
                // Handle HowToSection with steps
                for (const step of inst.itemListElement) {
                  if (step.text) {
                    rawInstructions.push(step.text);
                  } else if (step.name) {
                    rawInstructions.push(step.name);
                  }
                }
              } else if (inst['@type'] === 'HowToStep') {
                // Handle individual HowToStep
                rawInstructions.push(inst.text || inst.name || '');
              } else {
                // Fallback for other formats
                rawInstructions.push(inst.text || inst.name || '');
              }
            }
          } else if (typeof item.recipeInstructions === 'string') {
            rawInstructions.push(item.recipeInstructions);
          }

          const instructions = rawInstructions
            .filter((inst: string) => inst.trim())
            .map((inst: string, index: number) => parseInstruction(inst, index));

          const nutrition = item.nutrition ? {
            calories: item.nutrition.calories ? parseInt(item.nutrition.calories) : undefined,
            protein: item.nutrition.proteinContent || undefined,
            carbohydrates: item.nutrition.carbohydrateContent || undefined,
            fat: item.nutrition.fatContent || undefined,
            saturatedFat: item.nutrition.saturatedFatContent || undefined,
            cholesterol: item.nutrition.cholesterolContent || undefined,
            sodium: item.nutrition.sodiumContent || undefined,
            fiber: item.nutrition.fiberContent || undefined,
            sugar: item.nutrition.sugarContent || undefined,
            servingSize: item.nutrition.servingSize || undefined,
            servingsPerContainer: item.nutrition.servingsPerContainer ? parseInt(item.nutrition.servingsPerContainer) : undefined,
          } : undefined;

          // Extract equipment if available
          const equipment = item.recipeEquipment ? 
            (Array.isArray(item.recipeEquipment) ? 
              item.recipeEquipment.map((eq: any) => typeof eq === 'string' ? eq : eq.name).filter(Boolean) :
              [item.recipeEquipment]) : undefined;

          return {
            title: item.name || '',
            description: item.description || undefined,
            ingredients,
            instructions,
            servings: item.recipeYield ? parseInt(item.recipeYield) : undefined,
            yield: item.recipeYield || undefined,
            cookTime: item.cookTime ? parseTimeToMinutes(item.cookTime) : undefined,
            prepTime: item.prepTime ? parseTimeToMinutes(item.prepTime) : undefined,
            totalTime: item.totalTime ? parseTimeToMinutes(item.totalTime) : undefined,
            imageUrl: typeof item.image === 'string' ? item.image : item.image?.url || undefined,
            cuisine: Array.isArray(item.recipeCuisine) ? item.recipeCuisine[0] : item.recipeCuisine || undefined,
            category: Array.isArray(item.recipeCategory) ? item.recipeCategory[0] : item.recipeCategory || undefined,
            diet: Array.isArray(item.suitableForDiet) ? item.suitableForDiet[0] : item.suitableForDiet || undefined,
            difficulty: item.difficulty || undefined,
            sourceAuthor: item.author ? (typeof item.author === 'string' ? item.author : item.author.name) : undefined,
            equipment,
            nutrition,
          };
        }
      }
    } catch (error) {
      console.warn('Failed to parse JSON-LD:', error);
      continue;
    }
  }
  
  return null;
}

function extractMicrodata($: cheerio.CheerioAPI): ScrapedRecipe | null {
  const recipeElement = $('[itemtype*="Recipe"]').first();
  if (recipeElement.length === 0) return null;

  const title = recipeElement.find('[itemprop="name"]').first().text().trim();
  const description = recipeElement.find('[itemprop="description"]').first().text().trim();
  
  const ingredients: ScrapedIngredient[] = [];
  recipeElement.find('[itemprop="recipeIngredient"]').each((_, el) => {
    const ingredient = $(el).text().trim();
    if (ingredient) ingredients.push(parseIngredient(ingredient));
  });

  const instructions: ScrapedInstruction[] = [];
  recipeElement.find('[itemprop="recipeInstructions"]').each((_, el) => {
    const instruction = $(el).text().trim();
    if (instruction) instructions.push(parseInstruction(instruction, instructions.length));
  });

  const servings = recipeElement.find('[itemprop="recipeYield"]').first().text().trim();
  const cookTime = recipeElement.find('[itemprop="cookTime"]').first().attr('datetime') || 
                   recipeElement.find('[itemprop="cookTime"]').first().text().trim();
  const prepTime = recipeElement.find('[itemprop="prepTime"]').first().attr('datetime') || 
                   recipeElement.find('[itemprop="prepTime"]').first().text().trim();
  const totalTime = recipeElement.find('[itemprop="totalTime"]').first().attr('datetime') || 
                    recipeElement.find('[itemprop="totalTime"]').first().text().trim();
  const imageUrl = recipeElement.find('[itemprop="image"]').first().attr('src') || 
                   recipeElement.find('[itemprop="image"]').first().attr('content');

  if (!title && ingredients.length === 0) return null;

  return {
    title: title || 'Untitled Recipe',
    description: description || undefined,
    ingredients,
    instructions,
    servings: servings ? parseInt(servings) : undefined,
    cookTime: cookTime ? parseTimeToMinutes(cookTime) : undefined,
    prepTime: prepTime ? parseTimeToMinutes(prepTime) : undefined,
    totalTime: totalTime ? parseTimeToMinutes(totalTime) : undefined,
    imageUrl: imageUrl || undefined,
  };
}

function extractFallback($: cheerio.CheerioAPI): ScrapedRecipe | null {
  const title = $('h1').first().text().trim() || 
                $('title').text().trim() || 
                $('.recipe-title, .entry-title, .post-title').first().text().trim();

  if (!title) return null;

  const ingredients: ScrapedIngredient[] = [];
  const seenIngredients = new Set<string>();
  $('.ingredient, .recipe-ingredient, [class*="ingredient"]').each((_, el) => {
    const ingredient = $(el).text().trim();
    if (ingredient && !seenIngredients.has(ingredient)) {
      seenIngredients.add(ingredient);
      ingredients.push(parseIngredient(ingredient));
    }
  });

  const instructions: ScrapedInstruction[] = [];
  const seenInstructions = new Set<string>();
  $('.instruction, .recipe-instruction, .direction, [class*="instruction"], [class*="direction"]').each((_, el) => {
    const instruction = $(el).text().trim();
    if (instruction && !seenInstructions.has(instruction)) {
      seenInstructions.add(instruction);
      instructions.push(parseInstruction(instruction, instructions.length));
    }
  });

  const imageUrl = $('img').filter((_, el) => {
    const src = $(el).attr('src') || '';
    const alt = $(el).attr('alt') || '';
    return src.includes('recipe') || alt.toLowerCase().includes('recipe') || 
           $(el).closest('.recipe, [class*="recipe"]').length > 0;
  }).first().attr('src');

  return {
    title,
    description: undefined,
    ingredients,
    instructions,
    imageUrl: imageUrl || undefined,
  };
}

export async function scrapeRecipe(url: string): Promise<ScrapedRecipe> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const jsonLdResult = extractJsonLd($);
    if (jsonLdResult) {
      return jsonLdResult;
    }

    const microdataResult = extractMicrodata($);
    if (microdataResult) {
      return microdataResult;
    }

    const fallbackResult = extractFallback($);
    if (fallbackResult) {
      return fallbackResult;
    }

    throw new Error('Could not extract recipe data from the provided URL');
  } catch (error) {
    throw new Error(`Failed to scrape recipe: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}