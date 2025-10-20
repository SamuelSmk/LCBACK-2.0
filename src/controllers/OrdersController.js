const ErrorApplication = require("../utils/ErrorApplication");
const moment = require("moment-timezone");
const knex = require("../database/knex");

class OrdersController {
  async create(req, res) {
    const { client_id, address, payment_method, products, notes } = req.body;
    const company_id = req.headers['company_id'];

    if (!company_id) {
      throw new ErrorApplication("company_id é obrigatório nos headers", 400);
    }

    if (!client_id || !products || !Array.isArray(products) || products.length === 0) {
      throw new ErrorApplication("client_id e produtos são obrigatórios", 400);
    }

    // Verificar se a empresa existe
    const company = await knex("companies").where({ id: company_id }).first();
    if (!company) {
      throw new ErrorApplication("Empresa não encontrada.", 404);
    }

    // Verificar se o cliente existe e pertence à empresa
    const client = await knex("clients").where({ id: client_id, company_id }).first();
    if (!client) {
      throw new ErrorApplication("Cliente não encontrado nesta empresa.", 404);
    }

    // Validar e buscar preços dos produtos
    let total_value = 0;
    const productsData = [];

    for (const item of products) {
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        throw new ErrorApplication("Cada produto deve ter product_id e quantity válida", 400);
      }

      const product = await knex("products")
        .where({ id: item.product_id, company_id })
        .first();

      if (!product) {
        throw new ErrorApplication(`Produto com ID ${item.product_id} não encontrado`, 404);
      }

      const unit_price = parseFloat(product.price);
      const quantity = parseInt(item.quantity);
      const subtotal = unit_price * quantity;

      productsData.push({
        product_id: item.product_id,
        quantity: quantity,
        unit_price: unit_price,
        subtotal: subtotal
      });

      total_value += subtotal;
    }

    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss");

    // Criar pedido em transação
    const trx = await knex.transaction();

    try {
      // Inserir pedido
      const [order] = await trx("orders")
        .insert({
          company_id,
          client_id,
          status: 'pending',
          total_value: total_value,
          address: address || client.address,
          payment_method,
          notes: notes || null,
          created_at: now,
          updated_at: now,
        })
        .returning(['id', 'client_id', 'status', 'total_value', 'address', 'payment_method', 'notes', 'created_at', 'updated_at']);

      // Inserir produtos do pedido
      const orderProducts = productsData.map(p => ({
        order_id: order.id,
        product_id: p.product_id,
        quantity: p.quantity,
        unit_price: p.unit_price,
        subtotal: p.subtotal,
        created_at: now
      }));

      await trx("order_products").insert(orderProducts);

      await trx.commit();

      // Buscar pedido completo com produtos
      const fullOrder = await this.getOrderWithDetails(order.id, company_id);

      return res.status(201).json(fullOrder);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async index(req, res) {
    const company_id = req.headers['company_id'];
    const { status, client_id, payment_method } = req.query;

    if (!company_id) {
      throw new ErrorApplication("company_id é obrigatório nos headers", 400);
    }

    let ordersQuery = knex("orders")
      .select(
        "orders.id",
        "orders.client_id",
        "orders.status",
        "orders.total_value",
        "orders.address",
        "orders.payment_method",
        "orders.notes",
        "orders.created_at",
        "orders.updated_at",
        "clients.name as client_name",
        "clients.phone_number as client_phone"
      )
      .leftJoin("clients", "orders.client_id", "clients.id")
      .where("orders.company_id", company_id);

    // Filtros
    if (status) {
      ordersQuery = ordersQuery.where("orders.status", status);
    }

    if (client_id) {
      ordersQuery = ordersQuery.where("orders.client_id", client_id);
    }

    if (payment_method) {
      ordersQuery = ordersQuery.where("orders.payment_method", payment_method);
    }

    const orders = await ordersQuery.orderBy("orders.created_at", "desc");

    // Buscar produtos de cada pedido
    for (const order of orders) {
      const products = await knex("order_products")
        .select(
          "order_products.id",
          "order_products.quantity",
          "order_products.unit_price",
          "order_products.subtotal",
          "products.name as product_name",
          "products.category as product_category"
        )
        .leftJoin("products", "order_products.product_id", "products.id")
        .where("order_products.order_id", order.id);

      order.products = products;
    }

    return res.json(orders);
  }

  async show(req, res) {
    const { id } = req.params;
    const company_id = req.headers['company_id'];

    if (!id) {
      throw new ErrorApplication("ID do pedido é obrigatório", 400);
    }

    if (!company_id) {
      throw new ErrorApplication("company_id é obrigatório nos headers", 400);
    }

    const order = await this.getOrderWithDetails(id, company_id);

    if (!order) {
      throw new ErrorApplication("Pedido não encontrado", 404);
    }

    return res.json(order);
  }

  async delete(req, res) {
    const { id } = req.params;
    const company_id = req.headers['company_id'];

    if (!company_id || !id) {
      throw new ErrorApplication(
        "company_id nos headers e ID do pedido são obrigatórios",
        400
      );
    }

    const order = await knex("orders").where({ id, company_id }).first();

    if (!order) {
      throw new ErrorApplication("Pedido não encontrado", 404);
    }

    // Deletar pedido (os produtos são deletados automaticamente por CASCADE)
    await knex("orders").where({ id, company_id }).delete();

    return res.json({ message: "Pedido excluído com sucesso" });
  }

  async update(req, res) {
    const { id } = req.params;
    const { status, address, payment_method, products, notes } = req.body;
    const company_id = req.headers['company_id'];

    if (!company_id) {
      throw new ErrorApplication("company_id é obrigatório nos headers", 400);
    }

    const order = await knex("orders").where({ id, company_id }).first();

    if (!order) {
      throw new ErrorApplication("Pedido não encontrado.", 404);
    }

    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss");
    const trx = await knex.transaction();

    try {
      const updatedData = {
        updated_at: now
      };

      // Atualizar produtos se fornecidos
      if (products && Array.isArray(products) && products.length > 0) {
        // Deletar produtos antigos
        await trx("order_products").where({ order_id: id }).delete();

        // Recalcular total
        let total_value = 0;
        const productsData = [];

        for (const item of products) {
          if (!item.product_id || !item.quantity || item.quantity <= 0) {
            throw new ErrorApplication("Cada produto deve ter product_id e quantity válida", 400);
          }

          const product = await trx("products")
            .where({ id: item.product_id, company_id })
            .first();

          if (!product) {
            throw new ErrorApplication(`Produto com ID ${item.product_id} não encontrado`, 404);
          }

          const unit_price = parseFloat(product.price);
          const quantity = parseInt(item.quantity);
          const subtotal = unit_price * quantity;

          productsData.push({
            order_id: id,
            product_id: item.product_id,
            quantity: quantity,
            unit_price: unit_price,
            subtotal: subtotal,
            created_at: now
          });

          total_value += subtotal;
        }

        // Inserir novos produtos
        await trx("order_products").insert(productsData);
        updatedData.total_value = total_value;
      }

      if (status !== undefined) updatedData.status = status;
      if (address !== undefined) updatedData.address = address;
      if (payment_method !== undefined) updatedData.payment_method = payment_method;
      if (notes !== undefined) updatedData.notes = notes;

      await trx("orders").update(updatedData).where({ id, company_id });

      await trx.commit();

      const updatedOrder = await this.getOrderWithDetails(id, company_id);

      return res.status(200).json({
        message: "Pedido atualizado com sucesso.",
        order: updatedOrder
      });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  // Método auxiliar para buscar pedido com detalhes
  async getOrderWithDetails(orderId, companyId) {
    const order = await knex("orders")
      .select(
        "orders.id",
        "orders.client_id",
        "orders.status",
        "orders.total_value",
        "orders.address",
        "orders.payment_method",
        "orders.notes",
        "orders.created_at",
        "orders.updated_at",
        "clients.name as client_name",
        "clients.phone_number as client_phone",
        "clients.document as client_document"
      )
      .leftJoin("clients", "orders.client_id", "clients.id")
      .where({ "orders.id": orderId, "orders.company_id": companyId })
      .first();

    if (!order) {
      return null;
    }

    // Buscar produtos do pedido
    const products = await knex("order_products")
      .select(
        "order_products.id",
        "order_products.product_id",
        "order_products.quantity",
        "order_products.unit_price",
        "order_products.subtotal",
        "products.name as product_name",
        "products.category as product_category"
      )
      .leftJoin("products", "order_products.product_id", "products.id")
      .where("order_products.order_id", orderId);

    order.products = products;

    return order;
  }

  // Método extra: Atualizar apenas o status
  async updateStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    const company_id = req.headers['company_id'];

    if (!company_id) {
      throw new ErrorApplication("company_id é obrigatório nos headers", 400);
    }

    if (!status) {
      throw new ErrorApplication("Status é obrigatório", 400);
    }

    const validStatuses = ['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new ErrorApplication(`Status inválido. Use: ${validStatuses.join(', ')}`, 400);
    }

    const order = await knex("orders").where({ id, company_id }).first();

    if (!order) {
      throw new ErrorApplication("Pedido não encontrado.", 404);
    }

    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss");

    await knex("orders")
      .update({ status, updated_at: now })
      .where({ id, company_id });

    const updatedOrder = await this.getOrderWithDetails(id, company_id);

    return res.status(200).json({
      message: "Status do pedido atualizado com sucesso.",
      order: updatedOrder
    });
  }
}

module.exports = new OrdersController();
