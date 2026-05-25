const path = require('path');

const config = process.env.DATABASE_URL
  ? {
      client: 'pg',
      connection: process.env.DATABASE_URL,
      migrations: {
        directory: path.join(__dirname, 'migrations'),
        tableName: 'knex_migrations'
      }
    }
  : {
      client: 'sqlite3',
      connection: {
        filename: path.join(__dirname, 'medos.db')
      },
      useNullAsDefault: true,
      migrations: {
        directory: path.join(__dirname, 'migrations'),
        tableName: 'knex_migrations'
      }
    };

module.exports = {
  development: config,
  production: config,
  test: config
};
