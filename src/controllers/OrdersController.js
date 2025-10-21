const knex = require('../database/knex');
const ErrorApplication = require('../utils/ErrorApplication');
const moment = require('moment-timezone');

class OrdersController {
  /**
   * Cria um novo pedido com itens
   */
  async create(request, response) {
    const { client_id, address, payment_method, notes, items } = request.body;
    const { company_id } = request.headers;
    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss");
    
    try {
      if (!company_id) {
        throw new ErrorApplication('company_id é obrigatório nos headers', 400);
      }

      // Verificar se o cliente existe
      const clientExists = await knex('clients').where({ id: client_id, company_id }).first();
      
      if (!clientExists) {
        throw new ErrorApplication('Cliente não encontrado para esta empresa', 404);
      }

      // Usar transação para garantir que tudo seja criado ou nada
      const result = await knex.transaction(async trx => {
        // Criar o pedido
        const orderResult = await trx('orders').insert({
          company_id,
          client_id,
          status: 'pending',
          address: address || clientExists.address,
          payment_method: payment_method || null,
          notes: notes || null,
          total_value: 0, // Será calculado depois
          created_at: now,
          updated_at: now
        }).returning('id');
        
        const order_id = Array.isArray(orderResult) ? (orderResult[0]?.id || orderResult[0]) : orderResult.id;

        // Se enviou itens, adicionar ao pedido
        let insertedItems = [];
        let total_value = 0;

        if (items && Array.isArray(items) && items.length > 0) {
          const itemsToInsert = [];
          
          for (const item of items) {
            const { 
              produtos_id, 
              additional_id = null,
              quantity, 
              price,
              notes: item_notes = null
            } = item;
            
            if (!produtos_id) {
              throw new ErrorApplication('ID do produto é obrigatório', 400);
            }

            if (!quantity || quantity <= 0) {
              throw new ErrorApplication('Quantidade deve ser maior que zero', 400);
            }

            // Verificar se o produto existe e pertence à empresa
            const productExists = await trx('produtos')
              .where({ id: produtos_id, company_id })
              .first();
            
            if (!productExists) {
              throw new ErrorApplication(`Produto ID ${produtos_id} não encontrado para esta empresa`, 404);
            }

            // Se tiver additional_id, verificar se existe e pertence à empresa
            if (additional_id) {
              const additionalExists = await trx('additional')
                .where({ id: additional_id, company_id })
                .first();
              
              if (!additionalExists) {
                throw new ErrorApplication(`Adicional ID ${additional_id} não encontrado para esta empresa`, 404);
              }
            }

            // Determinar o preço
            let finalPrice = price;
            if (!finalPrice) {
              finalPrice = productExists.price;
            }

            if (!finalPrice || finalPrice <= 0) {
              throw new ErrorApplication('Preço deve ser maior que zero', 400);
            }

            const itemTotal = parseFloat(finalPrice) * parseInt(quantity);
            total_value += itemTotal;

            itemsToInsert.push({
              company_id,
              produtos_id,
              orders_id: order_id,
              additional_id,
              quantity: parseInt(quantity),
              price: parseFloat(finalPrice),
              notes: item_notes,
              created_at: now,
              updated_at: now
            });
          }

          // Inserir os itens
          const insertedIds = [];
          for (const item of itemsToInsert) {
            const itemResult = await trx('orders_itens').insert(item).returning('id');
            const item_id = Array.isArray(itemResult) ? (itemResult[0]?.id || itemResult[0]) : itemResult.id;
            insertedIds.push(item_id);
          }
          
          // Buscar os detalhes completos dos itens inseridos
          if (insertedIds.length > 0) {
            const itemsDetails = await trx('orders_itens')
              .whereIn('id', insertedIds)
              .select('*');
              
            insertedItems = await Promise.all(itemsDetails.map(async (item) => {
              let itemDetails = { ...item };
              
              const product = await trx('produtos')
                .where({ id: item.produtos_id })
                .select('name', 'category')
                .first();
              
              if (product) {
                itemDetails.produto_name = product.name;
                itemDetails.produto_category = product.category;
              }

              if (item.additional_id) {
                const additional = await trx('additional')
                  .where({ id: item.additional_id })
                  .select('name', 'price')
                  .first();
                
                if (additional) {
                  itemDetails.additional_name = additional.name;
                  itemDetails.additional_price = additional.price;
                }
              }
              
              return itemDetails;
            }));
          }
        }

        // Atualizar o total do pedido
        await trx('orders')
          .where({ id: order_id })
          .update({ total_value });

        return {
          order_id,
          items: insertedItems,
          total_value
        };
      });

      return response.status(201).json({ 
        id: result.order_id,
        items: result.items,
        items_count: result.items.length,
        total_value: result.total_value,
        message: 'Pedido criado com sucesso' + (result.items.length > 0 ? ` com ${result.items.length} itens` : '')
      });
    } catch (error) {
      if (error instanceof ErrorApplication) {
        throw error;
      }
      throw new ErrorApplication(`Erro ao criar pedido: ${error.message}`);
    }
  }

  /**
   * Lista todos os pedidos de uma empresa com filtros
   */
  async index(request, response) {
    const { company_id } = request.headers;
    const { client_id, date_start, date_end, date, status, payment_method } = request.query;
    
    try {
      if (!company_id) {
        throw new ErrorApplication('company_id é obrigatório nos headers', 400);
      }

      let query = knex('orders')
        .where({ 'orders.company_id': company_id })
        .select([
          'orders.id',
          'orders.client_id',
          'orders.status',
          'orders.total_value',
          'orders.address',
          'orders.payment_method',
          'orders.notes',
          'orders.created_at',
          'orders.updated_at',
          'clients.name as client_name',
          'clients.phone as client_phone',
          'clients.document as client_document'
        ])
        .leftJoin('clients', 'orders.client_id', 'clients.id')
        .orderBy('orders.created_at', 'desc');

      // Aplicar filtros
      if (client_id) {
        query = query.where('orders.client_id', client_id);
      }

      if (date) {
        query = query.whereRaw("DATE(orders.created_at) = ?", [date]);
      } else if (date_start && date_end) {
        query = query.whereBetween('orders.created_at', [date_start, date_end]);
      }
      
      if (status) {
        query = query.where('orders.status', status);
      }

      if (payment_method) {
        query = query.where('orders.payment_method', payment_method);
      }

      const orders = await query;

      // Para cada pedido, buscar os itens
      const ordersWithItems = await Promise.all(orders.map(async (order) => {
        const items = await knex('orders_itens')
          .where({ orders_id: order.id })
          .select('*');

        // Buscar detalhes adicionais para cada item
        const itemsWithDetails = await Promise.all(items.map(async (item) => {
          let itemDetails = { ...item };
          
          const product = await knex('produtos')
            .where({ id: item.produtos_id })
            .select('name', 'category')
            .first();
          
          if (product) {
            itemDetails.produto_name = product.name;
            itemDetails.produto_category = product.category;
          }

          if (item.additional_id) {
            const additional = await knex('additional')
              .where({ id: item.additional_id })
              .select('name', 'price')
              .first();
            
            if (additional) {
              itemDetails.additional_name = additional.name;
              itemDetails.additional_price = additional.price;
            }
          }
          
          return itemDetails;
        }));

        return {
          ...order,
          items: itemsWithDetails,
          items_count: items.length
        };
      }));

      return response.json(ordersWithItems);
    } catch (error) {
      if (error instanceof ErrorApplication) {
        throw error;
      }
      throw new ErrorApplication(`Erro ao listar pedidos: ${error.message}`);
    }
  }

  /**
   * Obtém os detalhes de um pedido específico
   */
  async show(request, response) {
    const { id } = request.params;
    const { company_id } = request.headers;
    
    try {
      if (!company_id) {
        throw new ErrorApplication('company_id é obrigatório nos headers', 400);
      }

      // Buscar o pedido
      const order = await knex('orders')
        .where({ 'orders.id': id, 'orders.company_id': company_id })
        .select([
          'orders.id',
          'orders.company_id',
          'orders.client_id',
          'orders.status',
          'orders.total_value',
          'orders.address',
          'orders.payment_method',
          'orders.notes',
          'orders.created_at',
          'orders.updated_at',
          'clients.name as client_name',
          'clients.email as client_email',
          'clients.phone as client_phone',
          'clients.document as client_document'
        ])
        .leftJoin('clients', 'orders.client_id', 'clients.id')
        .first();

      if (!order) {
        throw new ErrorApplication('Pedido não encontrado', 404);
      }

      // Buscar os itens do pedido
      const items = await knex('orders_itens')
        .where({ orders_id: id })
        .select('*');

      // Detalhar cada item
      const detailedItems = await Promise.all(items.map(async (item) => {
        let itemDetails = { ...item };

        const product = await knex('produtos')
          .where({ id: item.produtos_id })
          .select('name', 'category')
          .first();
        
        itemDetails.produto_name = product ? product.name : 'Produto não encontrado';
        itemDetails.produto_category = product ? product.category : '';

        if (item.additional_id) {
          const additional = await knex('additional')
            .where({ id: item.additional_id })
            .select('name', 'price')
            .first();
          
          if (additional) {
            itemDetails.additional_name = additional.name;
            itemDetails.additional_price = additional.price;
          }
        }

        return itemDetails;
      }));

      return response.json({
        ...order,
        items: detailedItems,
        items_count: detailedItems.length
      });
    } catch (error) {
      if (error instanceof ErrorApplication) {
        throw error;
      }
      throw new ErrorApplication(`Erro ao buscar detalhes do pedido: ${error.message}`);
    }
  }

  /**
   * Adiciona múltiplos itens ao pedido
   */
  async addMultipleItems(request, response) {
    const { order_id } = request.params;
    const { items } = request.body;
    const { company_id } = request.headers;
    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss");
    
    try {
      if (!company_id) {
        throw new ErrorApplication('company_id é obrigatório nos headers', 400);
      }

      // Verificar se o pedido existe
      const orderExists = await knex('orders').where({ id: order_id, company_id }).first();
      
      if (!orderExists) {
        throw new ErrorApplication('Pedido não encontrado', 404);
      }
  
      if (!Array.isArray(items) || items.length === 0) {
        throw new ErrorApplication('É necessário enviar pelo menos um item', 400);
      }
  
      // Validar cada item e preparar para inserção
      const itemsToInsert = [];
      let additionalTotal = 0;
      
      for (const item of items) {
        const { 
          produtos_id, 
          additional_id = null,
          quantity, 
          price,
          notes = null
        } = item;
        
        if (!produtos_id || !quantity || !price) {
          throw new ErrorApplication('Cada item deve ter produtos_id, quantity e price', 400);
        }
  
        if (quantity <= 0) {
          throw new ErrorApplication('A quantidade deve ser maior que zero', 400);
        }

        if (price <= 0) {
          throw new ErrorApplication('O preço deve ser maior que zero', 400);
        }

        // Verificar se o produto existe
        const productExists = await knex('produtos').where({ id: produtos_id, company_id }).first();
        if (!productExists) {
          throw new ErrorApplication(`Produto ID ${produtos_id} não encontrado para esta empresa`, 404);
        }

        // Verificar adicional se fornecido
        if (additional_id) {
          const additionalExists = await knex('additional').where({ id: additional_id, company_id }).first();
          if (!additionalExists) {
            throw new ErrorApplication(`Adicional ID ${additional_id} não encontrado para esta empresa`, 404);
          }
        }

        const itemTotal = parseFloat(price) * parseInt(quantity);
        additionalTotal += itemTotal;
        
        itemsToInsert.push({
          company_id,
          produtos_id,
          orders_id: order_id,
          additional_id,
          quantity: parseInt(quantity),
          price: parseFloat(price),
          notes,
          created_at: now,
          updated_at: now
        });
      }
  
      // Inserir todos os itens em uma transação
      const insertedIds = await knex.transaction(async trx => {
        const ids = [];
        for (const item of itemsToInsert) {
          const itemResult = await trx('orders_itens').insert(item).returning('id');
          const item_id = Array.isArray(itemResult) ? (itemResult[0]?.id || itemResult[0]) : itemResult.id;
          ids.push(item_id);
        }

        // Atualizar o total do pedido
        await trx('orders')
          .where({ id: order_id })
          .increment('total_value', additionalTotal);

        return ids;
      });
  
      return response.status(201).json({ 
        ids: insertedIds,
        message: `${insertedIds.length} itens adicionados ao pedido com sucesso` 
      });
    } catch (error) {
      if (error instanceof ErrorApplication) {
        throw error;
      }
      throw new ErrorApplication(`Erro ao adicionar itens ao pedido: ${error.message}`);
    }
  }

  /**
   * Remove um item do pedido
   */
  async removeItem(request, response) {
    const { order_id, item_id } = request.params;
    const { company_id } = request.headers;
    
    try {
      if (!company_id) {
        throw new ErrorApplication('company_id é obrigatório nos headers', 400);
      }

      // Verificar se o item existe no pedido
      const itemExists = await knex('orders_itens')
        .where({ id: item_id, orders_id: order_id, company_id })
        .first();
      
      if (!itemExists) {
        throw new ErrorApplication('Item não encontrado neste pedido', 404);
      }

      // Usar transação
      await knex.transaction(async trx => {
        // Calcular valor do item
        const itemTotal = itemExists.price * itemExists.quantity;

        // Remover o item
        await trx('orders_itens')
          .where({ id: item_id })
          .delete();

        // Atualizar o total do pedido
        await trx('orders')
          .where({ id: order_id })
          .decrement('total_value', itemTotal);
      });

      return response.json({ message: 'Item removido do pedido com sucesso' });
    } catch (error) {
      if (error instanceof ErrorApplication) {
        throw error;
      }
      throw new ErrorApplication(`Erro ao remover item do pedido: ${error.message}`);
    }
  }

  /**
   * Atualiza a quantidade de um item
   */
  async updateItemQuantity(request, response) {
    const { order_id, item_id } = request.params;
    const { quantity } = request.body;
    const { company_id } = request.headers;
    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss");
    
    try {
      if (!company_id) {
        throw new ErrorApplication('company_id é obrigatório nos headers', 400);
      }

      if (!quantity || quantity <= 0) {
        throw new ErrorApplication('Quantidade deve ser maior que zero', 400);
      }

      // Verificar se o item existe
      const itemExists = await knex('orders_itens')
        .where({ id: item_id, orders_id: order_id, company_id })
        .first();
      
      if (!itemExists) {
        throw new ErrorApplication('Item não encontrado neste pedido', 404);
      }

      // Usar transação
      await knex.transaction(async trx => {
        // Calcular diferença no total
        const oldTotal = itemExists.price * itemExists.quantity;
        const newTotal = itemExists.price * quantity;
        const difference = newTotal - oldTotal;

        // Atualizar a quantidade
        await trx('orders_itens')
          .where({ id: item_id })
          .update({ 
            quantity: parseInt(quantity),
            updated_at: now
          });

        // Atualizar o total do pedido
        if (difference !== 0) {
          await trx('orders')
            .where({ id: order_id })
            .increment('total_value', difference);
        }
      });

      return response.json({ 
        message: 'Quantidade do item atualizada com sucesso',
        quantity
      });
    } catch (error) {
      if (error instanceof ErrorApplication) {
        throw error;
      }
      throw new ErrorApplication(`Erro ao atualizar quantidade do item: ${error.message}`);
    }
  }

  /**
   * Atualiza o status de um pedido
   */
  async updateStatus(request, response) {
    const { id } = request.params;
    const { status } = request.body;
    const { company_id } = request.headers;
    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss");
    
    try {
      if (!company_id) {
        throw new ErrorApplication('company_id é obrigatório nos headers', 400);
      }

      // Verificar se o pedido existe
      const orderExists = await knex('orders').where({ id, company_id }).first();
      
      if (!orderExists) {
        throw new ErrorApplication('Pedido não encontrado', 404);
      }

      // Validar o status
      const validStatus = ['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'];
      
      if (!status || !validStatus.includes(status)) {
        throw new ErrorApplication(`Status inválido. Use: ${validStatus.join(', ')}`, 400);
      }

      // Atualizar o status
      await knex('orders')
        .where({ id })
        .update({ 
          status,
          updated_at: now
        });

      return response.json({ 
        message: `Status do pedido atualizado para ${status}`,
        status
      });
    } catch (error) {
      if (error instanceof ErrorApplication) {
        throw error;
      }
      throw new ErrorApplication(`Erro ao atualizar status do pedido: ${error.message}`);
    }
  }

  /**
   * Deleta um pedido
   */
  async delete(request, response) {
    const { id } = request.params;
    const { company_id } = request.headers;
    
    try {
      if (!company_id) {
        throw new ErrorApplication('company_id é obrigatório nos headers', 400);
      }

      // Verificar se o pedido existe
      const orderExists = await knex('orders').where({ id, company_id }).first();
      
      if (!orderExists) {
        throw new ErrorApplication('Pedido não encontrado', 404);
      }

      // Deletar o pedido (os itens serão deletados por cascata)
      await knex('orders').where({ id }).delete();

      return response.json({ message: 'Pedido excluído com sucesso' });
    } catch (error) {
      if (error instanceof ErrorApplication) {
        throw error;
      }
      throw new ErrorApplication(`Erro ao excluir pedido: ${error.message}`);
    }
  }

  /**
   * Lista pedidos por cliente
   */
  async listByClient(request, response) {
    const { client_id } = request.params;
    const { company_id } = request.headers;
    
    try {
      if (!company_id) {
        throw new ErrorApplication('company_id é obrigatório nos headers', 400);
      }

      const orders = await knex('orders')
        .where({ client_id, company_id })
        .select([
          'orders.id',
          'orders.status',
          'orders.total_value',
          'orders.address',
          'orders.payment_method',
          'orders.created_at',
          'orders.updated_at'
        ])
        .orderBy('orders.created_at', 'desc');

      // Para cada pedido, buscar contagem de itens
      const ordersWithDetails = await Promise.all(orders.map(async (order) => {
        const itemsCount = await knex('orders_itens')
          .where({ orders_id: order.id })
          .count('* as count')
          .first();

        return {
          ...order,
          items_count: parseInt(itemsCount.count)
        };
      }));

      return response.json(ordersWithDetails);
    } catch (error) {
      if (error instanceof ErrorApplication) {
        throw error;
      }
      throw new ErrorApplication(`Erro ao listar pedidos do cliente: ${error.message}`);
    }
  }

  /**
   * Atualiza dados do pedido
   */
  async update(request, response) {
    const { id } = request.params;
    const { client_id, address, payment_method, notes } = request.body;
    const { company_id } = request.headers;
    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss");
    
    try {
      if (!company_id) {
        throw new ErrorApplication('company_id é obrigatório nos headers', 400);
      }

      // Verificar se o pedido existe
      const orderExists = await knex('orders').where({ id, company_id }).first();
      
      if (!orderExists) {
        throw new ErrorApplication('Pedido não encontrado', 404);
      }

      const updateData = {};
      
      if (client_id) {
        const clientExists = await knex('clients')
          .where({ id: client_id, company_id })
          .first();
        
        if (!clientExists) {
          throw new ErrorApplication('Cliente não encontrado para esta empresa', 404);
        }
        
        updateData.client_id = client_id;
      }
      
      if (address !== undefined) updateData.address = address;
      if (payment_method !== undefined) updateData.payment_method = payment_method;
      if (notes !== undefined) updateData.notes = notes;
      
      if (Object.keys(updateData).length === 0) {
        return response.json({ 
          message: 'Nenhuma alteração fornecida',
          order: orderExists
        });
      }
      
      updateData.updated_at = now;
      
      await knex('orders').where({ id }).update(updateData);
      
      const updatedOrder = await knex('orders').where({ id }).first();
      
      return response.json({ 
        message: 'Pedido atualizado com sucesso',
        order: updatedOrder
      });
    } catch (error) {
      if (error instanceof ErrorApplication) {
        throw error;
      }
      throw new ErrorApplication(`Erro ao atualizar pedido: ${error.message}`);
    }
  }
}

module.exports = new OrdersController();
