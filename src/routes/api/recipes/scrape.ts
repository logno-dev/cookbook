import { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '~/lib/middleware';
import { scrapeRecipe } from '~/lib/recipe-scraper';

export async function POST(event: APIEvent) {
  try {
    const user = await requireAuth(event);
    const body = await event.request.json();
    const { url } = body;

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let validUrl: URL;
    try {
      validUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!['http:', 'https:'].includes(validUrl.protocol)) {
      return new Response(JSON.stringify({ error: 'Only HTTP and HTTPS URLs are allowed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const scrapedRecipe = await scrapeRecipe(url);

    return new Response(JSON.stringify({ recipe: { ...scrapedRecipe, sourceUrl: url } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Recipe scraping error:', error);
    
    if (error instanceof Error && error.message.includes('Authentication')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (error instanceof Error && error.message.includes('scrape')) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Failed to scrape recipe from URL' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}