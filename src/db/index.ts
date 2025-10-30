import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// Use local SQLite for development if Turso credentials are not available
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:.sqlite',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });