const ErrorApplication = require("../utils/ErrorApplication")
const moment = require("moment-timezone")
const knex = require("../database/knex")

class ClientsController {
  async create(req, res) {
    const { name, phone, address, document, email} = req.body
    const { company_id } = req.headers

    if (!company_id) {
      throw new ErrorApplication("O ID da empresa é obrigatório", 400)
    }

    if (!name) {
      throw new ErrorApplication("Nome é obrigatório", 400)
    }

    if (!phone) {
      throw new ErrorApplication("Telefone é obrigatório", 400)
    }

    if (!email) {
      throw new ErrorApplication("E-mail é obrigatório", 400)
    }

    if (!address) {
      throw new ErrorApplication("Endereço é obrigatório", 400)
    }

    const company = await knex("companies").where({ id: company_id }).first()
    if (!company) {
      throw new ErrorApplication("Empresa não encontrada.", 404)
    }

    // Verificar se o telefone já está cadastrado nesta empresa
    const phoneUsed = await knex("clients")
      .where({ phone, company_id })
      .first()

    if (phoneUsed) {
      throw new ErrorApplication("Este telefone já está cadastrado nesta empresa", 400)
    }

    if (document) {
      const documentUsed = await knex("clients")
        .where({ document, company_id })
        .first()

      if (documentUsed) {
        throw new ErrorApplication("Este documento já está cadastrado nesta empresa", 400)
      }
    }

    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss")

    const [client] = await knex("clients")
      .insert({
        name,
        phone,
        address,
        document: document || null,
        email,
        company_id,
        created_at: now,
        updated_at: now,
      })
      .returning([
        "id",
        "name",
        "phone",
        "address",
        "document",
        "email",
        "company_id",
        "created_at",
        "updated_at",
      ])

    return res.status(201).json(client)
  }

  async index(req, res) {
    const { company_id } = req.headers
    const { term, document } = req.query

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa")
    }

    let clientsQuery = knex("clients")
      .select(
        "id",
        "name",
        "phone",
        "address",
        "document",
        "email",
        "created_at",
        "updated_at"
      )
      .where("company_id", company_id)

    if (term) {
      clientsQuery = clientsQuery.where(function() {
        this.where("name", "like", `%${term}%`)
          .orWhere("phone", "like", `%${term}%`)
          .orWhere("document", "like", `%${term}%`)
      })
    }

    if (document) {
      clientsQuery = clientsQuery.where("document", document)
    }

    const clients = await clientsQuery.orderBy("name", "asc")

    return res.json(clients)
  }

  async show(req, res) {
    const { id } = req.params
    const { company_id } = req.headers

    if (!id) {
      throw new ErrorApplication("é necessario enviado o Id do cliente")
    }

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa")
    }

    const client = await knex("clients")
      .select("id", "name", "phone", "address", "document", "email", "company_id", "created_at", "updated_at")
      .where({ id, company_id })
      .first()
    
    if (!client) {
      throw new ErrorApplication("Cliente não encontrado", 404)
    }
    
    return res.json(client)
  }

  async delete(req, res) {
    const { id } = req.params
    const { company_id } = req.headers

    if (!company_id || !id) {
      throw new ErrorApplication(
        "É necessario enviar o ID da empresa e também Id do cliente"
      )
    }

    const client = await knex("clients").where({ id, company_id }).first()
    
    if (!client) {
      throw new ErrorApplication("Cliente não encontrado", 404)
    }
    
    await knex("clients").where({ id, company_id }).delete()
    
    return res.json({ message: "Cliente excluído com sucesso" })
  }

  async update(req, res) {
    const { id } = req.params
    const { name, phone, address, document, email } = req.body
    const { company_id } = req.headers

    if (!company_id) {
      throw new ErrorApplication("É necessario enviar o ID da empresa")
    }

    const client = await knex("clients").where({ id, company_id }).first()

    if (!client) {
      return res.status(404).json({ message: "Cliente não encontrado." })
    }

    // Verificar se o telefone já está cadastrado em outro cliente desta empresa
    if (phone && phone !== client.phone) {
      const existingClientWithPhone = await knex("clients")
        .where({ phone, company_id })
        .andWhereNot({ id })
        .first()

      if (existingClientWithPhone) {
        return res.status(400).json({
          message: "Esse telefone já está vinculado a outro cliente dessa empresa.",
        })
      }
    }

    if (document && document !== client.document) {
      const existingClientWithDocument = await knex("clients")
        .where({ document, company_id })
        .andWhereNot({ id })
        .first()

      if (existingClientWithDocument) {
        return res.status(400).json({
          message:
            "Esse documento já está vinculado a outro cliente dessa empresa.",
        })
      }
    }

    const updatedData = {
      name,
      phone,
      address,
      document: document || null,
      email,
    }

    await knex("clients").update(updatedData).where({ id, company_id })

    const updatedClient = await knex("clients")
      .select("id", "name", "phone", "address", "document", "email", "company_id", "created_at", "updated_at")
      .where({ id, company_id })
      .first()

    return res.status(200).json({
      message: "Cliente atualizado com sucesso.",
      client: updatedClient
    })
  }

  async findByDocument(req, res) {
    const { document } = req.params
    const { company_id } = req.headers

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa")
    }

    if (!document) {
      throw new ErrorApplication("Documento é obrigatório", 400)
    }

    const client = await knex("clients")
      .select("id", "name", "phone", "address", "document", "email", "company_id", "created_at", "updated_at")
      .where({ document, company_id })
      .first()
    
    if (!client) {
      throw new ErrorApplication("Cliente não encontrado", 404)
    }
    
    return res.json(client)
  }

  async findByPhone(req, res) {
    const { phone } = req.params
    const { company_id } = req.headers

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa")
    }

    if (!phone) {
      throw new ErrorApplication("Telefone é obrigatório", 400)
    }

    const client = await knex("clients")
      .select("id", "name", "phone", "address", "document", "email", "company_id", "created_at", "updated_at")
      .where({ phone, company_id })
      .first()
    
    if (!client) {
      throw new ErrorApplication("Cliente não encontrado", 404)
    }
    
    return res.json(client)
  }
}

module.exports = new ClientsController()
