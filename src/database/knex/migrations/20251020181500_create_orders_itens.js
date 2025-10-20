/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('orders_itens', function(table) {
    table.increments('id').primary();
    table.integer('company_id').unsigned().notNullable();
    table.foreign('company_id').references('id').inTable('companies').onDelete('CASCADE');
    table.integer('produtos_id').unsigned().notNullable();
    table.foreign('produtos_id').references('id').inTable('produtos').onDelete('CASCADE');
    table.integer('orders_id').unsigned().notNullable();
    table.foreign('orders_id').references('id').inTable('orders').onDelete('CASCADE');
    table.integer('additional_id').unsigned();
    table.foreign('additional_id').references('id').inTable('additional').onDelete('SET NULL');
    table.integer('quantity').notNullable();
    table.decimal('price', 10, 2).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('orders_itens');
};
