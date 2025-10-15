const knex = require("../database/knex");
const axios = require("axios");

async function checkStock(products, company_id, req) { 
  const webhooks = await knex("webhooks")
    .where({ company_id })
    .andWhere({ action: 'stock' });

  const consolidatedProducts = products.reduce((acc, { product_id, amount }) => {
    if (!acc[product_id]) {
      acc[product_id] = 0;
    }
    acc[product_id] += amount;
    return acc;
  }, {});

  for (const [product_id, amount] of Object.entries(consolidatedProducts)) {
    const productDb = await knex("products")
      .where({ id: product_id, company_id }) 
      .first();

    if (!productDb) {
      throw new Error(`Produto com ID ${product_id} não encontrado para a empresa ${company_id}`);
    }

    const newStock = productDb.stock - amount;

    if (newStock < 0) {
      const message = `🚫 *Venda perdida!* Você acabou de perder uma venda por não ter o produto *${productDb.name}* em estoque.`;
      if (req && req.io) {
        req.io.to(company_id).emit("stockNotification", { message }); 
      } else {
        console.error("req.io não está definido");
      }
      throw new Error(`Quantidade solicitada para o produto ${productDb.name} é maior do que o disponível em estoque`);
    }

    if (newStock <= 5) {
      let message;
      if (newStock === 0) {
        message = `⚠️ *Estoque zerado!* O produto *${productDb.name}* acabou de ficar sem estoque.`;
      } else {
        message = `⚠️ *Estoque baixo!* O produto *${productDb.name}* está com apenas ${newStock} unidades em estoque.`;
      }

      if (req && req.io) {
        req.io.to(company_id).emit("stockNotification", { message });
      } else {
        console.error("req.io não está definido");
      }

      for (const webhook of webhooks) {
        try {
          await axios.post(webhook.url, {
            message,
            product: productDb.name,
            stock: newStock,
            company_id
          });
        } catch (error) {
          console.error(`Erro ao enviar webhook para ${webhook.url}:`, error);
        }
      }
    }

    await knex("products")
      .where({ id: productDb.id })
      .update({ stock: newStock });
  }
}

module.exports = { checkStock };
