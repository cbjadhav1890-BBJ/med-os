const fs = require('fs');
const path = require('path');

exports.up = async function(knex) {
  // We only run this SQL migration if we are using PostgreSQL.
  // SQLite schema is automatically set up by server.js/index.js on startup.
  if (knex.client.config.client === 'pg') {
    const sql = fs.readFileSync(path.join(__dirname, '001_initial_schema.sql'), 'utf8');
    await knex.raw(sql);
    console.log('✅ PostgreSQL initial schema migration successfully applied');
  } else {
    console.log('Skipping SQL migration on SQLite — server.js/index.js will handle auto-schema setup.');
  }
};

exports.down = function(knex) {
  // Safe down migration: do nothing by default
};
