const ErrorApplication = require("../utils/ErrorApplication")
const moment = require("moment-timezone")
const knex = require("../database/knex")

class AdditionalController {
  async create(req, res) {
    const { name, price, product_id } = req.body
    const { company_id } = req.headers

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa", 400)
    }

    if (!name) {
      throw new ErrorApplication("Nome é obrigatório", 400)
    }

    if (!price) {
      throw new ErrorApplication("Preço é obrigatório", 400)
    }

    const company = await knex("companies").where({ id: company_id }).first()
    if (!company) {
      throw new ErrorApplication("Empresa não encontrada", 404)
    }

    if (product_id) {
      const product = await knex("produtos").where({ id: product_id, company_id }).first()
      if (!product) {
        throw new ErrorApplication("Produto não encontrado", 404)
      }
    }

    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss")

    const [additional] = await knex("additional")
      .insert({
        name,
        price,
        product_id: product_id || null,
        company_id,
        created_at: now,
        updated_at: now,
      })
      .returning([
        "id",
        "name",
        "price",
        "product_id",
        "company_id",
        "created_at",
        "updated_at",
      ])

    return res.status(201).json(additional)
  }

  async index(req, res) {
    const { product_id, term } = req.query
    const { company_id } = req.headers

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa", 400)
    }

    let additionalQuery = knex("additional")
      .select(
        "id",
        "name",
        "price",
        "product_id",
        "company_id",
        "created_at",
        "updated_at"
      )
      .where("company_id", company_id)

    if (product_id) {
      additionalQuery = additionalQuery.where("product_id", product_id)
    }

    if (term) {
      additionalQuery = additionalQuery.where("name", "like", `%${term}%`)
    }

    const additionals = await additionalQuery.orderBy("name", "asc")

    return res.json(additionals)
  }

  async show(req, res) {
    const { id } = req.params
    const { company_id } = req.headers

    if (!id) {
      throw new ErrorApplication("É necessário enviar o ID do adicional", 400)
    }

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa", 400)
    }

    const additional = await knex("additional")
      .select("id", "name", "price", "product_id", "company_id", "created_at", "updated_at")
      .where({ id, company_id })
      .first()
    
    if (!additional) {
      throw new ErrorApplication("Adicional não encontrado", 404)
    }
    
    return res.json(additional)
  }

  async delete(req, res) {
    const { id } = req.params
    const { company_id } = req.headers

    if (!id) {
      throw new ErrorApplication("É necessário enviar o ID do adicional", 400)
    }

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa", 400)
    }

    const additional = await knex("additional").where({ id, company_id }).first()
    
    if (!additional) {
      throw new ErrorApplication("Adicional não encontrado", 404)
    }
    
    await knex("additional").where({ id, company_id }).delete()
    
    return res.json({ message: "Adicional excluído com sucesso" })
  }

  async update(req, res) {
    const { id } = req.params
    const { name, price, product_id } = req.body
    const { company_id } = req.headers

    if (!id) {
      throw new ErrorApplication("É necessário enviar o ID do adicional", 400)
    }

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa", 400)
    }

    const additional = await knex("additional").where({ id, company_id }).first()

    if (!additional) {
      throw new ErrorApplication("Adicional não encontrado", 404)
    }

    if (product_id) {
      const product = await knex("produtos").where({ id: product_id, company_id }).first()
      if (!product) {
        throw new ErrorApplication("Produto não encontrado", 404)
      }
    }

    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss")

    const updatedData = {
      name: name || additional.name,
      price: price || additional.price,
      product_id: product_id !== undefined ? product_id : additional.product_id,
      updated_at: now,
    }

    await knex("additional").update(updatedData).where({ id, company_id })

    const updatedAdditional = await knex("additional")
      .select("id", "name", "price", "product_id", "company_id", "created_at", "updated_at")
      .where({ id, company_id })
      .first()

    return res.status(200).json({
      message: "Adicional atualizado com sucesso.",
      additional: updatedAdditional
    })
  }

  async findByProduct(req, res) {
    const { product_id } = req.params
    const { company_id } = req.headers

    if (!product_id) {
      throw new ErrorApplication("ID do produto é obrigatório", 400)
    }

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa", 400)
    }

    const product = await knex("produtos").where({ id: product_id, company_id }).first()
    if (!product) {
      throw new ErrorApplication("Produto não encontrado", 404)
    }

    const additionals = await knex("additional")
      .select("id", "name", "price", "product_id", "company_id", "created_at", "updated_at")
      .where({ product_id, company_id })
      .orderBy("name", "asc")
    
    return res.json(additionals)
  }
}

module.exports = new AdditionalController()
