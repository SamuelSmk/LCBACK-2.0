const ErrorApplication = require("../utils/ErrorApplication")
const moment = require("moment-timezone")
const knex = require("../database/knex")

class ProductsController {
  async create(req, res) {
    const { name, price, category } = req.body
    const { company_id } = req.headers

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa")
    }

    if (!name || !price || !category) {
      throw new ErrorApplication("Nome, preço e categoria são obrigatórios", 400)
    }

    if (isNaN(price) || parseFloat(price) < 0) {
      throw new ErrorApplication("Preço deve ser um número válido e positivo", 400)
    }

    const company = await knex("companies").where({ id: company_id }).first()
    if (!company) {
      throw new ErrorApplication("Empresa não encontrada.", 404)
    }

    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss")

    const [product] = await knex("produtos")
      .insert({
        name,
        price: parseFloat(price),
        category,
        company_id,
        created_at: now,
        updated_at: now,
      })
      .returning([
        "id",
        "name",
        "price",
        "category",
        "company_id",
        "created_at",
        "updated_at",
      ])

    return res.status(201).json(product)
  }

  async index(req, res) {
    const { company_id } = req.headers
    const { term, category } = req.query

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa")
    }

    let productsQuery = knex("produtos")
      .select(
        "id",
        "name",
        "price",
        "category",
        "created_at",
        "updated_at"
      )
      .where("company_id", company_id)

    if (term) {
      productsQuery = productsQuery.where("name", "like", `%${term}%`)
    }

    if (category) {
      productsQuery = productsQuery.where("category", category)
    }

    const products = await productsQuery.orderBy("name", "asc")

    return res.json(products)
  }

  async show(req, res) {
    const { id } = req.params
    const { company_id } = req.headers

    if (!id) {
      throw new ErrorApplication("é necessario enviado o Id do produto")
    }

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa")
    }

    const product = await knex("produtos")
      .select("id", "name", "price", "category", "company_id", "created_at", "updated_at")
      .where({ id, company_id })
      .first()
    
    if (!product) {
      throw new ErrorApplication("Produto não encontrado", 404)
    }
    
    return res.json(product)
  }

  async delete(req, res) {
    const { id } = req.params
    const { company_id } = req.headers

    if (!company_id || !id) {
      throw new ErrorApplication(
        "É necessario enviar o ID da empresa e também Id do produto"
      )
    }

    const product = await knex("produtos").where({ id, company_id }).first()
    
    if (!product) {
      throw new ErrorApplication("Produto não encontrado", 404)
    }
    
    await knex("produtos").where({ id, company_id }).delete()
    
    return res.json({ message: "Produto excluído com sucesso" })
  }

  async update(req, res) {
    const { id } = req.params
    const { name, price, category } = req.body
    const { company_id } = req.headers

    if (!company_id) {
      throw new ErrorApplication("É necessario enviar o ID da empresa")
    }

    const product = await knex("produtos").where({ id, company_id }).first()

    if (!product) {
      return res.status(404).json({ message: "Produto não encontrado." })
    }

    if (price !== undefined) {
      if (isNaN(price) || parseFloat(price) < 0) {
        throw new ErrorApplication("Preço deve ser um número válido e positivo", 400)
      }
    }

    const updatedData = {
      name,
      price: price ? parseFloat(price) : product.price,
      category,
    }

    await knex("produtos").update(updatedData).where({ id, company_id })

    const updatedProduct = await knex("produtos")
      .select("id", "name", "price", "category", "company_id", "created_at", "updated_at")
      .where({ id, company_id })
      .first()

    return res.status(200).json({
      message: "Produto atualizado com sucesso.",
      product: updatedProduct
    })
  }

  async categories(req, res) {
    const { company_id } = req.headers

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa")
    }

    const categories = await knex("produtos")
      .distinct("category")
      .where("company_id", company_id)
      .orderBy("category", "asc")

    return res.json(categories.map(c => c.category))
  }
}

module.exports = new ProductsController()
