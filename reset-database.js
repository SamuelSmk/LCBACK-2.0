const knex = require('knex');
const knexConfig = require('./knexfile');

const db = knex(knexConfig.development);

async function resetDatabase() {
  try {
    console.log('Conectando ao banco de dados...');
    
    // Drop todas as tabelas
    await db.raw('DROP SCHEMA public CASCADE');
    console.log('Schema public dropado com sucesso');
    
    // Recria o schema
    await db.raw('CREATE SCHEMA public');
    await db.raw('GRANT ALL ON SCHEMA public TO postgres');
    await db.raw('GRANT ALL ON SCHEMA public TO public');
    console.log('Schema public recriado com sucesso');
    
    console.log('Banco de dados resetado com sucesso!');
  } catch (error) {
    console.error('Erro ao resetar banco de dados:', error.message);
  } finally {
    await db.destroy();
  }
}

resetDatabase();
