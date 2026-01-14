/**
 * Migration: Add agent_name column to llm_events table
 *
 * This script adds the `agent_name` column to all existing team schemas.
 * Run with: npx ts-node scripts/migrate-add-agent-name.ts
 *
 * Environment variables required:
 * - PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT (or PG_CONNECTION_STRING)
 */

import { Pool } from "pg";

const getPool = (): Pool => {
  // Support multiple env var names
  const connectionString =
    process.env.TSDB_PG_URL ||
    process.env.PG_CONNECTION_STRING ||
    process.env.DATABASE_URL;

  if (connectionString) {
    return new Pool({ connectionString });
  }

  return new Pool({
    host: process.env.PGHOST || "localhost",
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
    database: process.env.PGDATABASE || "aden",
    port: parseInt(process.env.PGPORT || "5432", 10),
  });
};

async function migrate() {
  const pool = getPool();

  try {
    console.log("[Migration] Starting agent_name column migration...");

    // Find all team schemas (schemas starting with 'team_')
    const schemasResult = await pool.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name LIKE 'team_%'
      ORDER BY schema_name
    `);

    const schemas = schemasResult.rows.map((r) => r.schema_name as string);
    console.log(`[Migration] Found ${schemas.length} team schemas`);

    if (schemas.length === 0) {
      console.log("[Migration] No team schemas found. Nothing to migrate.");
      return;
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const schema of schemas) {
      try {
        // Check if llm_events table exists in this schema
        const tableExists = await pool.query(
          `
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = $1 AND table_name = 'llm_events'
        `,
          [schema]
        );

        if (tableExists.rows.length === 0) {
          console.log(`[Migration] ${schema}: No llm_events table, skipping`);
          skipCount++;
          continue;
        }

        // Check if agent_name column already exists
        const columnExists = await pool.query(
          `
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = $1
            AND table_name = 'llm_events'
            AND column_name = 'agent_name'
        `,
          [schema]
        );

        if (columnExists.rows.length > 0) {
          console.log(`[Migration] ${schema}: agent_name column already exists, skipping`);
          skipCount++;
          continue;
        }

        // Add the agent_name column after agent column
        await pool.query(`
          ALTER TABLE ${schema}.llm_events
          ADD COLUMN agent_name text
        `);

        console.log(`[Migration] ${schema}: Added agent_name column`);
        successCount++;
      } catch (err) {
        console.error(`[Migration] ${schema}: Error - ${(err as Error).message}`);
        errorCount++;
      }
    }

    console.log("\n[Migration] Summary:");
    console.log(`  - Schemas processed: ${schemas.length}`);
    console.log(`  - Successfully migrated: ${successCount}`);
    console.log(`  - Skipped (already migrated or no table): ${skipCount}`);
    console.log(`  - Errors: ${errorCount}`);

    if (errorCount === 0) {
      console.log("\n[Migration] Completed successfully!");
    } else {
      console.log("\n[Migration] Completed with errors. Please review above.");
      process.exit(1);
    }
  } catch (err) {
    console.error("[Migration] Fatal error:", (err as Error).message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
