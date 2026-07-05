import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://uce:password@localhost:5432/uce_nexus_prod';

export const pool = new Pool({
  connectionString
});
