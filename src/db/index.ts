import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import * as schema from './schema';

// Load environment variables from .env file manually
let envVars: Record<string, string> = {};
try {
  const envContent = readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0 && !key.trim().startsWith('#')) {
      envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
} catch (error) {
  console.warn('Could not load .env file:', error);
}

// Use environment variables from .env or process.env, fallback to local SQLite
const databaseUrl = envVars.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL || 'file:.sqlite';
const authToken = envVars.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

console.log('Database URL:', databaseUrl.startsWith('libsql://') ? 'Turso (Remote)' : databaseUrl);

const client = createClient({
  url: databaseUrl,
  authToken: authToken,
});

export const db = drizzle(client, { schema });