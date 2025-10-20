const ErrorApplication = require("../utils/ErrorApplication")
const moment = require("moment-timezone")
const knex = require("../database/knex")

class PaymentMethodsController {
  async create(req, res) {
    const { name, notes, category } = req.body
    const { company_id } = req.headers

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa", 400)
    }

    if (!name) {
      throw new ErrorApplication("Nome é obrigatório", 400)
    }

    const company = await knex("companies").where({ id: company_id }).first()
    if (!company) {
      throw new ErrorApplication("Empresa não encontrada", 404)
    }

    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss")

    const [paymentMethod] = await knex("payment_methods")
      .insert({
        name,
        notes: notes || null,
        category: category || null,
        company_id,
        created_at: now,
        updated_at: now,
      })
      .returning([
        "id",
        "name",
        "notes",
        "category",
        "company_id",
        "created_at",
        "updated_at",
      ])

    return res.status(201).json(paymentMethod)
  }

  async index(req, res) {
    const { company_id } = req.headers
    const { term, category } = req.query

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa", 400)
    }

    let paymentMethodsQuery = knex("payment_methods")
      .select(
        "id",
        "name",
        "notes",
        "category",
        "created_at",
        "updated_at"
      )
      .where("company_id", company_id)

    if (term) {
      paymentMethodsQuery = paymentMethodsQuery.where(function() {
        this.where("name", "like", `%${term}%`)
          .orWhere("notes", "like", `%${term}%`)
      })
    }

    if (category) {
      paymentMethodsQuery = paymentMethodsQuery.where("category", category)
    }

    const paymentMethods = await paymentMethodsQuery.orderBy("name", "asc")

    return res.json(paymentMethods)
  }

  async show(req, res) {
    const { id } = req.params
    const { company_id } = req.headers

    if (!id) {
      throw new ErrorApplication("É necessário enviar o ID do método de pagamento", 400)
    }

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa", 400)
    }

    const paymentMethod = await knex("payment_methods")
      .select("id", "name", "notes", "category", "company_id", "created_at", "updated_at")
      .where({ id, company_id })
      .first()
    
    if (!paymentMethod) {
      throw new ErrorApplication("Método de pagamento não encontrado", 404)
    }
    
    return res.json(paymentMethod)
  }

  async delete(req, res) {
    const { id } = req.params
    const { company_id } = req.headers

    if (!id) {
      throw new ErrorApplication("É necessário enviar o ID do método de pagamento", 400)
    }

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa", 400)
    }

    const paymentMethod = await knex("payment_methods").where({ id, company_id }).first()
    
    if (!paymentMethod) {
      throw new ErrorApplication("Método de pagamento não encontrado", 404)
    }
    
    await knex("payment_methods").where({ id, company_id }).delete()
    
    return res.json({ message: "Método de pagamento excluído com sucesso" })
  }

  async update(req, res) {
    const { id } = req.params
    const { name, notes, category } = req.body
    const { company_id } = req.headers

    if (!id) {
      throw new ErrorApplication("É necessário enviar o ID do método de pagamento", 400)
    }

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa", 400)
    }

    const paymentMethod = await knex("payment_methods").where({ id, company_id }).first()

    if (!paymentMethod) {
      throw new ErrorApplication("Método de pagamento não encontrado", 404)
    }

    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss")

    const updatedData = {
      name: name || paymentMethod.name,
      notes: notes !== undefined ? notes : paymentMethod.notes,
      category: category !== undefined ? category : paymentMethod.category,
      updated_at: now,
    }

    await knex("payment_methods").update(updatedData).where({ id, company_id })

    const updatedPaymentMethod = await knex("payment_methods")
      .select("id", "name", "notes", "category", "company_id", "created_at", "updated_at")
      .where({ id, company_id })
      .first()

    return res.status(200).json({
      message: "Método de pagamento atualizado com sucesso.",
      paymentMethod: updatedPaymentMethod
    })
  }

  async categories(req, res) {
    const { company_id } = req.headers

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa", 400)
    }

    const categories = await knex("payment_methods")
      .distinct("category")
      .where("company_id", company_id)
      .whereNotNull("category")
      .orderBy("category", "asc")

    return res.json(categories.map(c => c.category))
  }
}

module.exports = new PaymentMethodsController()
