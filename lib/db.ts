import sql from "mssql";

const config: sql.config = {
  server: process.env.TMS_DB_SERVER!,
  port: Number(process.env.TMS_DB_PORT ?? 1433),
  database: process.env.TMS_DB_NAME!,
  user: process.env.TMS_DB_USER!,
  password: process.env.TMS_DB_PASSWORD!,

  options: {
    encrypt: true,
    trustServerCertificate: true,
  },

  pool: {
    max: 3,
    min: 0,
    idleTimeoutMillis: 30000,
  },

  connectionTimeout: 10000,
  requestTimeout: 30000,
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect().catch((error) => {
      poolPromise = null;
      throw error;
    });
  }

  return poolPromise;
}
