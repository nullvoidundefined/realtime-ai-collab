import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

function isProduction() { return process.env.NODE_ENV === "production"; }

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: isProduction() ? { rejectUnauthorized: false } : false,
});

export async function query<T extends QueryResultRow>(text: string, values?: unknown[], client?: PoolClient): Promise<QueryResult<T>> {
    return (client ?? pool).query<T>(text, values);
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const r = await fn(client);
        await client.query("COMMIT");
        return r;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}
