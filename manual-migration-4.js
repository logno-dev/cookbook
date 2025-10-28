import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

// Read environment variables from .env manually
const envContent = readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const client = createClient({
  url: envVars.TURSO_CONNECTION_URL,
  authToken: envVars.TURSO_AUTH_TOKEN,
});

async function runMigration() {
  try {
    console.log('Running migration 0004...');
    
    // Read the migration file
    const migrationSQL = readFileSync('./drizzle/0004_lying_supernaut.sql', 'utf8');
    
    // Split by statement-breakpoint and execute each statement
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('PRAGMA foreign_keys=OFF') && !s.startsWith('PRAGMA foreign_keys=ON'));

    // Turn off foreign keys
    await client.execute('PRAGMA foreign_keys=OFF');
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        await client.execute(statement);
      }
    }
    
    // Turn on foreign keys
    await client.execute('PRAGMA foreign_keys=ON');
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.close();
  }
}

runMigration();