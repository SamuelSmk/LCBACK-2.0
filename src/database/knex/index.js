const knex = require("knex");
const config = require("../../../knexfile");

// Detecta o ambiente atual e usa a configuração correspondente
const environment = process.env.NODE_ENV || "development";
const connection = knex(config[environment]);

module.exports = connection;
