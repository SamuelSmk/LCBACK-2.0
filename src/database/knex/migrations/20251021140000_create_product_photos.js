/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('product_photos', function(table) {
    table.increments('id').primary();
    table.integer('company_id').unsigned().notNullable();
    table.foreign('company_id').references('id').inTable('companies').onDelete('CASCADE');
    table.integer('produto_id').unsigned().notNullable();
    table.foreign('produto_id').references('id').inTable('produtos').onDelete('CASCADE');
    table.string('filename').notNullable();
    table.string('original_name').notNullable();
    table.string('mimetype').notNullable();
    table.integer('size').notNullable();
    table.string('url').notNullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('product_photos');
};
