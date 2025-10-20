const ErrorApplication = require("../utils/ErrorApplication")
const moment = require("moment-timezone")
const knex = require("../database/knex")

class OrdersItensController {
  /**
   * Adiciona múltiplos itens ao pedido
   */
  async addMultipleItems(req, res) {
    const { order_id } = req.params
    const { items } = req.body
    const { company_id } = req.headers

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa", 400)
    }

    if (!order_id) {
      throw new ErrorApplication("É necessário enviar o ID do pedido", 400)
    }

    // Verificar se o pedido existe e pertence à empresa
    const orderExists = await knex('orders')
      .where({ id: order_id, company_id })
      .first()
    
    if (!orderExists) {
      throw new ErrorApplication('Pedido não encontrado', 404)
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new ErrorApplication('É necessário enviar pelo menos um item', 400)
    }

    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss")

    // Validar cada item e preparar para inserção
    const itemsToInsert = []
    
    for (const item of items) {
      const { 
        produtos_id, 
        additional_id = null,
        quantity, 
        price
      } = item

      if (!produtos_id || !quantity || !price) {
        throw new ErrorApplication('Cada item deve ter produtos_id, quantity e price', 400)
      }

      if (quantity <= 0) {
        throw new ErrorApplication('A quantidade deve ser maior que zero', 400)
      }

      // Verificar se o produto existe e pertence à empresa
      const productExists = await knex('produtos')
        .where({ id: produtos_id, company_id })
        .first()
      
      if (!productExists) {
        throw new ErrorApplication(`Produto com ID ${produtos_id} não encontrado`, 404)
      }

      // Se tiver additional_id, verificar se existe e pertence à empresa
      if (additional_id) {
        const additionalExists = await knex('additional')
          .where({ id: additional_id, company_id })
          .first()
        
        if (!additionalExists) {
          throw new ErrorApplication(`Adicional com ID ${additional_id} não encontrado`, 404)
        }
      }

      itemsToInsert.push({
        company_id,
        produtos_id,
        orders_id: order_id,
        additional_id,
        quantity,
        price: parseFloat(price),
        created_at: now,
        updated_at: now
      })
    }

    // Inserir todos os itens
    const insertedItems = await knex('orders_itens')
      .insert(itemsToInsert)
      .returning([
        'id',
        'company_id',
        'produtos_id',
        'orders_id',
        'additional_id',
        'quantity',
        'price',
        'created_at',
        'updated_at'
      ])

    return res.status(201).json({
      message: 'Itens adicionados com sucesso',
      items: insertedItems
    })
  }

  /**
   * Remove um item do pedido
   */
  async removeItem(req, res) {
    const { order_id, item_id } = req.params
    const { company_id } = req.headers

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa", 400)
    }

    if (!order_id || !item_id) {
      throw new ErrorApplication("É necessário enviar o ID do pedido e do item", 400)
    }

    // Verificar se o item existe e pertence ao pedido e à empresa
    const item = await knex('orders_itens')
      .where({ 
        id: item_id, 
        orders_id: order_id,
        company_id 
      })
      .first()
    
    if (!item) {
      throw new ErrorApplication('Item não encontrado', 404)
    }

    await knex('orders_itens')
      .where({ id: item_id })
      .delete()

    return res.json({ message: 'Item removido com sucesso' })
  }

  /**
   * Atualiza a quantidade de um item
   */
  async updateItemQuantity(req, res) {
    const { order_id, item_id } = req.params
    const { quantity } = req.body
    const { company_id } = req.headers

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa", 400)
    }

    if (!order_id || !item_id) {
      throw new ErrorApplication("É necessário enviar o ID do pedido e do item", 400)
    }

    if (!quantity || quantity <= 0) {
      throw new ErrorApplication('A quantidade deve ser maior que zero', 400)
    }

    // Verificar se o item existe e pertence ao pedido e à empresa
    const item = await knex('orders_itens')
      .where({ 
        id: item_id, 
        orders_id: order_id,
        company_id 
      })
      .first()
    
    if (!item) {
      throw new ErrorApplication('Item não encontrado', 404)
    }

    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss")

    await knex('orders_itens')
      .where({ id: item_id })
      .update({ 
        quantity: parseInt(quantity),
        updated_at: now
      })

    const updatedItem = await knex('orders_itens')
      .where({ id: item_id })
      .first()

    return res.json({
      message: 'Quantidade atualizada com sucesso',
      item: updatedItem
    })
  }

  /**
   * Atualiza o preço de um item
   */
  async updateItemPrice(req, res) {
    const { order_id, item_id } = req.params
    const { price } = req.body
    const { company_id } = req.headers

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa", 400)
    }

    if (!order_id || !item_id) {
      throw new ErrorApplication("É necessário enviar o ID do pedido e do item", 400)
    }

    if (!price || price <= 0) {
      throw new ErrorApplication('O preço deve ser maior que zero', 400)
    }

    // Verificar se o item existe e pertence ao pedido e à empresa
    const item = await knex('orders_itens')
      .where({ 
        id: item_id, 
        orders_id: order_id,
        company_id 
      })
      .first()
    
    if (!item) {
      throw new ErrorApplication('Item não encontrado', 404)
    }

    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss")

    await knex('orders_itens')
      .where({ id: item_id })
      .update({ 
        price: parseFloat(price),
        updated_at: now
      })

    const updatedItem = await knex('orders_itens')
      .where({ id: item_id })
      .first()

    return res.json({
      message: 'Preço atualizado com sucesso',
      item: updatedItem
    })
  }

  /**
   * Lista todos os itens de um pedido
   */
  async listItems(req, res) {
    const { order_id } = req.params
    const { company_id } = req.headers

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa", 400)
    }

    if (!order_id) {
      throw new ErrorApplication("É necessário enviar o ID do pedido", 400)
    }

    // Verificar se o pedido existe e pertence à empresa
    const orderExists = await knex('orders')
      .where({ id: order_id, company_id })
      .first()
    
    if (!orderExists) {
      throw new ErrorApplication('Pedido não encontrado', 404)
    }

    const items = await knex('orders_itens')
      .select(
        'orders_itens.id',
        'orders_itens.produtos_id',
        'orders_itens.additional_id',
        'orders_itens.quantity',
        'orders_itens.price',
        'orders_itens.created_at',
        'orders_itens.updated_at',
        'produtos.name as produto_name',
        'produtos.category as produto_category',
        'additional.name as additional_name'
      )
      .leftJoin('produtos', 'orders_itens.produtos_id', 'produtos.id')
      .leftJoin('additional', 'orders_itens.additional_id', 'additional.id')
      .where({ 
        'orders_itens.orders_id': order_id,
        'orders_itens.company_id': company_id
      })
      .orderBy('orders_itens.created_at', 'asc')

    return res.json(items)
  }
}

module.exports = new OrdersItensController()
