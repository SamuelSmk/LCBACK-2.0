const knex = require('knex');
const config = require('./knexfile');

async function fixPhoneConstraint() {
  const db = knex(config.development);
  
  try {
    console.log('🔍 Verificando constraint da coluna phone...');
    
    // Verificar a estrutura atual da coluna phone
    const columnInfo = await db.raw(`
      SELECT column_name, is_nullable, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'clients' AND column_name = 'phone'
    `);
    
    console.log('📋 Info da coluna phone:', columnInfo.rows[0]);
    
    if (columnInfo.rows[0] && columnInfo.rows[0].is_nullable === 'NO') {
      console.log('⚠️ Coluna phone tem constraint NOT NULL. Removendo...');
      
      // Alterar a coluna para permitir NULL
      await db.raw('ALTER TABLE clients ALTER COLUMN phone DROP NOT NULL');
      
      console.log('✅ Constraint NOT NULL removida da coluna phone!');
      
      // Verificar novamente
      const newColumnInfo = await db.raw(`
        SELECT column_name, is_nullable, data_type, column_default
        FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'phone'
      `);
      
      console.log('📋 Nova info da coluna phone:', newColumnInfo.rows[0]);
    } else {
      console.log('✅ Coluna phone já permite NULL!');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await db.destroy();
  }
}

fixPhoneConstraint();
