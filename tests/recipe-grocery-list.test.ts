import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { eq, asc } from 'drizzle-orm';
import * as schema from '../src/db/schema.ts';
import { createRecipeGroceryList } from '../src/lib/create-recipe-grocery-list.ts';

async function fixture(t: { after: (fn: () => void) => void }) {
  const directory = mkdtempSync(join(tmpdir(), 'recipe-grocery-test-'));
  const client = createClient({ url: `file:${join(directory, 'test.sqlite')}` });
  t.after(() => { client.close(); rmSync(directory, { recursive: true, force: true }); });
  // Build isolated tables from the application's column definitions. Never import
  // the application connection, which loads production credentials from .env.
  for (const table of [schema.recipes, schema.recipeVariants, schema.groceryLists, schema.groceryListItems, schema.groceryListRecipes]) {
    const { name, columns } = getTableConfig(table);
    await client.execute(`CREATE TABLE "${name}" (${columns.map(c => `"${c.name}" ${c.getSQLType()}${c.primary ? ' PRIMARY KEY' : ''}${c.notNull ? ' NOT NULL' : ''}`).join(', ')})`);
  }
  const db = drizzle(client, { schema });
  await db.insert(schema.recipes).values({
    id: 'recipe', userId: 'alice', title: 'Pancakes', instructions: [],
    ingredients: [
      { ingredient: 'flour', quantity: '1 1/2', unit: 'cups', notes: 'sifted' },
      { ingredient: 'eggs', quantity: '2' },
      { ingredient: 'salt', quantity: 'to taste' },
      { ingredient: 'milk', quantity: '1-2', unit: 'cups' },
      { ingredient: '   ' },
    ],
  });
  return { db, client };
}

test('creates a populated list, scales fractions/unitless quantities, and retains notes/order', async t => {
  const { db } = await fixture(t);
  const list = await createRecipeGroceryList(db, 'alice', 'recipe', { multiplier: 2 });
  assert.equal(list.name, 'Pancakes');
  assert.equal(list.userId, 'alice');
  const items = await db.select().from(schema.groceryListItems).orderBy(asc(schema.groceryListItems.order));
  assert.deepEqual(items.map(i => [i.name, i.quantity, i.unit, i.notes, i.isCompleted]), [
    ['flour', '3', 'cups', 'sifted', false],
    ['eggs', '4', null, null, false],
    ['salt', 'to taste', null, null, false],
    ['milk', '4', 'cups', null, false],
  ]);
  const [link] = await db.select().from(schema.groceryListRecipes);
  assert.equal(link.recipeId, 'recipe');
  assert.equal(link.groceryListId, list.id);
  assert.equal(link.multiplier, 2);
});

test('uses the viewed variant overrides while retaining unchanged base ingredients', async t => {
  const { db } = await fixture(t);
  await db.insert(schema.recipeVariants).values({ id: 'variant', recipeId: 'recipe', name: 'Gluten free', ingredients: [{ ingredient: 'oat flour', quantity: '1', unit: 'cup' }, { ingredient: '' }] });
  const list = await createRecipeGroceryList(db, 'alice', 'recipe', { variantId: 'variant', multiplier: 1.5 });
  assert.equal(list.name, 'Pancakes — Gluten free');
  const items = await db.select().from(schema.groceryListItems).orderBy(asc(schema.groceryListItems.order));
  assert.equal(items[0].name, 'oat flour');
  assert.equal(items[0].quantity, '1.5');
  assert.equal(items[1].name, 'eggs');
  assert.equal(items[1].quantity, '3');
  const [link] = await db.select().from(schema.groceryListRecipes);
  assert.equal(link.variantId, 'variant');
});

test('rejects inaccessible recipes, foreign variants, invalid multipliers, and empty recipes without creating lists', async t => {
  const { db } = await fixture(t);
  await db.insert(schema.recipeVariants).values({ id: 'foreign', recipeId: 'another-recipe', name: 'Other' });
  await assert.rejects(createRecipeGroceryList(db, 'bob', 'recipe'), { status: 404 });
  await assert.rejects(createRecipeGroceryList(db, 'alice', 'missing'), { status: 404 });
  await assert.rejects(createRecipeGroceryList(db, 'alice', 'recipe', { variantId: 'foreign' }), { status: 404 });
  for (const multiplier of [0, -1, Infinity, NaN, '2', null]) {
    await assert.rejects(createRecipeGroceryList(db, 'alice', 'recipe', { multiplier: multiplier as number }), { status: 400 });
  }
  await db.update(schema.recipes).set({ ingredients: [] }).where(eq(schema.recipes.id, 'recipe'));
  await assert.rejects(createRecipeGroceryList(db, 'alice', 'recipe'), { status: 400 });
  assert.equal((await db.select().from(schema.groceryLists)).length, 0);
});

test('rolls back list and recipe link if inserting ingredients fails', async t => {
  const { db, client } = await fixture(t);
  await client.execute("CREATE TRIGGER fail_items BEFORE INSERT ON grocery_list_items BEGIN SELECT RAISE(ABORT, 'injected failure'); END");
  await assert.rejects(createRecipeGroceryList(db, 'alice', 'recipe'));
  assert.equal((await db.select().from(schema.groceryLists)).length, 0);
  assert.equal((await db.select().from(schema.groceryListRecipes)).length, 0);
  assert.equal((await db.select().from(schema.groceryListItems)).length, 0);
});
