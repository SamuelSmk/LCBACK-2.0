const path = require('path');
require('dotenv').config(); // Carregar variáveis de ambiente

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: '62.72.11.161',
      port: 5440,
      user: 'postgres',
      password: 'SlWgGHo0Vb9dTb9OIe1foK2y6wtKdiCue9LZD0oOxoidrDdjmePTIdkR95ehyFeO',
      database: 'postgres'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: path.resolve(__dirname, "src", "database", "knex", "migrations")
    }
  },

  production: {
    client: 'pg', // Use 'pg' para PostgreSQL
    connection: process.env.PG_URL, // Use a URL de conexão diretamente
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 10000
    },
    migrations: {
      directory: path.resolve(__dirname, "src", "database", "knex", "migrations")
    },
  },
};
