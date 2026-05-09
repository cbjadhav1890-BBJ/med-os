const path = require('path');

const knexConfig = process.env.DATABASE_URL
  ? {
      client: 'pg',
      connection: process.env.DATABASE_URL,
      searchPath: ['public'],
      pool: { min: 2, max: 10 },
    }
  : {
      client: 'sqlite3',
      connection: { filename: path.join(__dirname, '..', 'medos.db') },
      useNullAsDefault: true,
    };

const knex = require('knex')(knexConfig);

module.exports = { knex, knexConfig };