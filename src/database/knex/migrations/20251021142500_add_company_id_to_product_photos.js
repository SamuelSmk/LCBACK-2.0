/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Verifica se a coluna company_id já existe
  const hasColumn = await knex.schema.hasColumn('product_photos', 'company_id');
  
  if (!hasColumn) {
    // Adiciona a coluna company_id se não existir
    await knex.schema.table('product_photos', function(table) {
      table.integer('company_id').unsigned().notNullable().defaultTo(2);
    });
  } else {
    // Se já existe, atualiza os registros existentes para company_id = 2
    await knex('product_photos').update({ company_id: 2 });
  }
  
  // Verifica se a foreign key já existe antes de adicionar
  const tableInfo = await knex.raw(`
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'product_photos' 
    AND constraint_name = 'product_photos_company_id_foreign'
  `);
  
  if (tableInfo.rows.length === 0) {
    // Adiciona a foreign key se não existir
    await knex.schema.table('product_photos', function(table) {
      table.foreign('company_id').references('id').inTable('companies').onDelete('CASCADE');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('product_photos', function(table) {
    table.dropForeign('company_id');
    table.dropColumn('company_id');
  });
};
