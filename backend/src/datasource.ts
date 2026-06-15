import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';

loadEnv();

/** Standalone DataSource for `typeorm-ts-node-commonjs` CLI (migrations). */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'tripmate',
  entities: [join(__dirname, '/**/*.entity.{js,ts}')],
  migrations: [join(__dirname, '/database/migrations/*.{js,ts}')],
});
