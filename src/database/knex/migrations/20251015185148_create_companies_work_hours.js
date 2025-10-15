/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('companies_work_hours', function(table) {
    table.increments('id').primary();
    table.integer('company_id').unsigned().notNullable();
    table.foreign('company_id').references('id').inTable('companies').onDelete('CASCADE');
    table.string('day_of_week').notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.boolean('is_open').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('companies_work_hours');
};
