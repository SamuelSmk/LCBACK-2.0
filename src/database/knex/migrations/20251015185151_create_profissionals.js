/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('profissionals', function(table) {
    table.increments('id').primary();
    table.integer('company_id').unsigned().notNullable();
    table.foreign('company_id').references('id').inTable('companies').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('email').notNullable();
    table.string('password').notNullable();
    table.text('phone_number').notNullable();
    table.text('position');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('profissionals');
};
