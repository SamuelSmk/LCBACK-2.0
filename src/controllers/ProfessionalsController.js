const ErrorApplication = require("../utils/ErrorApplication")
const moment = require("moment-timezone")
const knex = require("../database/knex")
const bcrypt = require("bcryptjs")

class ProfessionalsController {
  async create(req, res) {
    const { 
      name, 
      email, 
      password, 
      position, 
      phone_number 
    } = req.body
    const { company_id } = req.headers

    if (!company_id) {
      throw new ErrorApplication("O ID da empresa é obrigatório", 400)
    }

    if (!name || !email || !password || !position) {
      throw new ErrorApplication("Nome, email, senha e cargo são obrigatórios", 400)
    }

    const company = await knex("companies").where({ id: company_id }).first()
    if (!company) {
      throw new ErrorApplication("Empresa não encontrada.", 404)
    }

    const emailUsed = await knex("professionals").where({ email, company_id }).first()

    if (emailUsed) {
      throw new ErrorApplication("Este e-mail já está em uso nesta empresa", 400)
    }

    const hashedPassword = await bcrypt.hash(password, 8)

    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss")

    const [professional] = await knex("professionals")
      .insert({
        name,
        email,
        password: hashedPassword,
        position,
        phone_number,
        company_id,
        created_at: now,
        updated_at: now,
      })
      .returning([
        "id",
        "name",
        "email",
        "position",
        "phone_number",
        "company_id",
        "created_at",
        "updated_at",
      ])

    return res.status(201).json(professional)
  }

  async index(req, res) {
    const { company_id } = req.headers
    const { term } = req.query

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa")
    }

    let professionalsQuery = knex("professionals")
      .select(
        "id",
        "name",
        "email",
        "position",
        "phone_number",
        "created_at",
        "updated_at"
      )
      .where("company_id", company_id);

    // Filtro de busca por termo
    if (term) {
      professionalsQuery = professionalsQuery.where(function() {
        this.where("name", "like", `%${term}%`)
          .orWhere("email", "like", `%${term}%`);
      });
    }

    const professionals = await professionalsQuery.orderBy("name", "asc")

    return res.json(professionals)
  }

  async show(req, res) {
    const { id } = req.params
    const { company_id } = req.headers

    if (!id) {
      throw new ErrorApplication("é necessario enviado o Id do usuario")
    }

    if (!company_id) {
      throw new ErrorApplication("É necessário enviar o ID da empresa")
    }

    const professional = await knex("professionals")
      .select("id", "name", "email", "position", "phone_number", "company_id", "created_at", "updated_at")
      .where({ id, company_id })
      .first()
    
    if (!professional) {
      throw new ErrorApplication("Profissional não encontrado", 404)
    }
    
    return res.json(professional)
  }

  async delete(req, res) {
    const { id } = req.params
    const { company_id } = req.headers

    if (!company_id || !id) {
      throw new ErrorApplication(
        "É necessario enviar o ID da empresa e também Id do usuario"
      )
    }

    const professional = await knex("professionals").where({ id, company_id }).first()
    
    if (!professional) {
      throw new ErrorApplication("Profissional não encontrado", 404)
    }
    
    await knex("professionals").where({ id, company_id }).delete()
    
    return res.json({ message: "Profissional excluído com sucesso" })
  }

  async update(req, res) {
    const { id } = req.params
    const { name, email, password, position, phone_number } = req.body
    const { company_id } = req.headers

    if (!company_id) {
      throw new ErrorApplication("É necessario enviar o ID da empresa")
    }

    const professional = await knex("professionals").where({ id, company_id }).first()

    if (!professional) {
      return res.status(404).json({ message: "Usuário não encontrado." })
    }

    // Verificar se email já está em uso por outro profissional
    if (email && email !== professional.email) {
      const existingProfessionalWithEmail = await knex("professionals")
        .where({ email, company_id })
        .andWhereNot({ id })
        .first()

      if (existingProfessionalWithEmail) {
        return res.status(400).json({
          message:
            "Esse e-mail já está vinculado a um usuário dessa empresa.",
        })
      }
    }

    const updatedData = {
      name,
      email,
      phone_number,
      position,
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 8)
      updatedData.password = hashedPassword
    }

    await knex("professionals").update(updatedData).where({ id, company_id })

    const updatedProfessional = await knex("professionals").where({ id, company_id }).first()

    return res.status(200).json({
      message: "Usuário atualizado com sucesso.",
      user: updatedProfessional
    })
  }
}

module.exports = new ProfessionalsController()
