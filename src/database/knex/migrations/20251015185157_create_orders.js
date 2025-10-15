/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('orders', function(table) {
    table.increments('id').primary();
    table.integer('company_id').unsigned().notNullable();
    table.foreign('company_id').references('id').inTable('companies').onDelete('CASCADE');
    table.integer('client_id').unsigned();
    table.foreign('client_id').references('id').inTable('clients').onDelete('SET NULL');
    table.string('phone_number').notNullable();
    table.string('status').defaultTo('pending');
    table.string('address').notNullable();
    table.integer('profissionals_id').unsigned();
    table.foreign('profissionals_id').references('id').inTable('profissionals').onDelete('SET NULL');
    table.integer('products_id').unsigned();
    table.foreign('products_id').references('id').inTable('produtos').onDelete('SET NULL');
    table.integer('additional_id').unsigned();
    table.foreign('additional_id').references('id').inTable('additional').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('orders');
};
