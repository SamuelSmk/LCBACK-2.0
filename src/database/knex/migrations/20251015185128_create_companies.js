/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('companies', function(table) {
    table.increments('id').primary();
    table.integer('superadmin_id').unsigned().notNullable();
    table.foreign('superadmin_id').references('id').inTable('super_admins').onDelete('CASCADE');
    table.integer('plan_id').unsigned();
    table.string('subdomain').notNullable().unique();
    table.string('name').notNullable();
    table.string('email').notNullable();
    table.string('phone_number').notNullable();
    table.string('address');
    table.string('document').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('companies');
};
