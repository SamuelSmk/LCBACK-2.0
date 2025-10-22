/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('password_reset_codes', function(table) {
    table.increments('id').primary();
    table.string('email').notNullable();
    table.string('code', 6).notNullable();
    table.enum('user_type', ['professional', 'client']).notNullable();
    table.integer('user_id').notNullable();
    table.timestamp('expires_at').notNullable();
    table.boolean('used').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Índices para melhor performance
    table.index(['email', 'code']);
    table.index(['expires_at']);
    table.index(['used']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('password_reset_codes');
};
