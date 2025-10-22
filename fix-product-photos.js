const knex = require('./src/database/knex');

async function fixProductPhotos() {
  try {
    console.log('Atualizando fotos dos produtos...');

    // Atualizar foto da Caipirinha (produto ID 4)
    await knex('product_photos')
      .where({ produto_id: 4 })
      .update({
        filename: 'caipirinha.png',
        url: '/photos/caipirinha.png'
      });
    console.log('✓ Foto da Caipirinha atualizada');

    // Atualizar foto do Hamburguer (produto ID 7)
    await knex('product_photos')
      .where({ produto_id: 7 })
      .update({
        filename: 'hamburguer.png',
        url: '/photos/hamburguer.png'
      });
    console.log('✓ Foto do Hamburguer atualizada');

    console.log('\n✅ Todas as fotos foram atualizadas com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao atualizar fotos:', error);
    process.exit(1);
  }
}

fixProductPhotos();
