import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { GroceryListService } from '~/lib/grocery-list-service';

interface DuplicateMatch {
  primaryItem: any;
  duplicateItems: any[];
  confidence: number;
}

export async function POST(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const groceryListId = event.params?.id;
    
    if (!groceryListId) {
      return new Response(JSON.stringify({ error: 'Grocery list ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all current items in the grocery list
    const allItems = await GroceryListService.getGroceryListItems(groceryListId);
    
    if (allItems.length < 2) {
      return new Response(JSON.stringify({ 
        duplicateMatches: [],
        summary: { totalItems: allItems.length, duplicateGroups: 0 }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const duplicateMatches: DuplicateMatch[] = [];
    const processedItems = new Set<string>();

    // Compare each item with every other item
    for (let i = 0; i < allItems.length; i++) {
      const primaryItem = allItems[i];
      
      if (processedItems.has(primaryItem.id)) {
        continue; // Already processed as part of another group
      }

      const duplicateItems = [];
      
      // Look for similar items
      for (let j = i + 1; j < allItems.length; j++) {
        const otherItem = allItems[j];
        
        if (processedItems.has(otherItem.id)) {
          continue; // Already processed
        }

        const similarity = GroceryListService.calculateIngredientSimilarity(
          primaryItem.name.toLowerCase(),
          otherItem.name.toLowerCase()
        );

        // Use a threshold for duplicate detection (can be adjusted)
        if (similarity >= 0.6) {
          duplicateItems.push(otherItem);
          processedItems.add(otherItem.id);
        }
      }

      // If we found duplicates, create a match group
      if (duplicateItems.length > 0) {
        // Calculate the highest confidence score for this group
        const confidenceScores = duplicateItems.map(item => 
          GroceryListService.calculateIngredientSimilarity(
            primaryItem.name.toLowerCase(),
            item.name.toLowerCase()
          )
        );
        const maxConfidence = Math.max(...confidenceScores);

        duplicateMatches.push({
          primaryItem,
          duplicateItems,
          confidence: maxConfidence
        });
        
        processedItems.add(primaryItem.id);
      }
    }

    return new Response(JSON.stringify({
      duplicateMatches,
      summary: {
        totalItems: allItems.length,
        duplicateGroups: duplicateMatches.length,
        totalDuplicates: duplicateMatches.reduce((sum, match) => sum + match.duplicateItems.length, 0)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Check duplicates error:', error);
    
    if (error instanceof Error && error.message.includes('Authentication')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}