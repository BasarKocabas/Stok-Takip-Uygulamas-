import path from 'path';
import type { Knex } from 'knex';

const config: Knex.Config = {
  client: 'better-sqlite3',
  connection: {
    filename: path.resolve(process.cwd(), 'data/app.db'),
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.resolve(process.cwd(), 'src/db/migrations'),
    extension: 'ts',
  },
  seeds: {
    directory: path.resolve(process.cwd(), 'src/db/seeds'),
    extension: 'ts',
  },
};

export default config;
