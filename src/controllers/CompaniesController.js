const knex = require("../database/knex")
const ErrorApplication = require("../utils/ErrorApplication")
const moment = require("moment-timezone")

class CompaniesController {
  async create(req, res) {
    const { name, document, phone_number, address, email} = req.body
    const { superadmin_id } = req.headers
    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss")

    if (!name || !document || !phone_number || !address || !email) {
      throw new ErrorApplication("Todos os campos são obrigatórios!")
    }

    if (!superadmin_id) {
      throw new ErrorApplication("superadmin_id é obrigatório nos headers!", 401)
    }

    const superAdmin = await knex("super_admins").where({ id: superadmin_id }).first()
    if (!superAdmin) {
      throw new ErrorApplication("Super Admin não encontrado.", 404)
    }

    const documentUsed = await knex("companies").where({ document }).first()
    if (documentUsed) {
      throw new ErrorApplication("Já existe uma empresa registrada com esse documento!")
    }

    const emailUsed = await knex("companies").where({ email }).first()
    if (emailUsed) {
      throw new ErrorApplication("Já existe uma empresa registrada com este e-mail.")
    }

    let finalSubdomain = subdomain || name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")

    const subdomainExists = await knex("companies").where({ subdomain: finalSubdomain }).first()
    if (subdomainExists) {
      const count = await knex("companies").count('id as count').first()
      finalSubdomain = `${finalSubdomain}-${count.count + 1}`
    }

    try {
      let company
      
      await knex.transaction(async (trx) => {
        const [company_id] = await trx("companies").insert({
          name,
          document,
          phone_number,
          address,
          email,
          superadmin_id,
          subdomain: finalSubdomain,
          plan_id: plan_id || null,
          created_at: now,
          updated_at: now
        }).returning("id")
        
        const companyIdValue = typeof company_id === 'object' ? company_id.id : company_id
        const defaultWorkingHours = [
          { company_id: companyIdValue, day_of_week: 0, start_time: "00:00", end_time: "00:00", is_open: false, created_at: now, updated_at: now },
          { company_id: companyIdValue, day_of_week: 1, start_time: "08:00", end_time: "18:00", is_open: true, created_at: now, updated_at: now },
          { company_id: companyIdValue, day_of_week: 2, start_time: "08:00", end_time: "18:00", is_open: true, created_at: now, updated_at: now },
          { company_id: companyIdValue, day_of_week: 3, start_time: "08:00", end_time: "18:00", is_open: true, created_at: now, updated_at: now },
          { company_id: companyIdValue, day_of_week: 4, start_time: "08:00", end_time: "18:00", is_open: true, created_at: now, updated_at: now },
          { company_id: companyIdValue, day_of_week: 5, start_time: "08:00", end_time: "18:00", is_open: true, created_at: now, updated_at: now },
          { company_id: companyIdValue, day_of_week: 6, start_time: "09:00", end_time: "13:00", is_open: true, created_at: now, updated_at: now }
        ]
        
        await trx("company_working_hours").insert(defaultWorkingHours)
        
        company = await trx("companies").where({ id: companyIdValue }).first()
      })
      
      return res.status(201).json(company)
    } catch (error) {
      console.error("Erro ao criar empresa:", error)
      throw new ErrorApplication("Erro ao criar empresa: " + error.message, 500)
    }
  }

  async update(req, res) {
    const { id } = req.params
    const { name, phone_number, email, address, document, plan_id, subdomain } = req.body
    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss")

    const company = await knex("companies").where({ id }).first()
    if (!company) {
      throw new ErrorApplication("Empresa não encontrada.", 404)
    }

    if (document && document !== company.document) {
      const documentUsed = await knex("companies")
        .where({ document })
        .andWhereNot({ id })
        .first()

      if (documentUsed) {
        throw new ErrorApplication("Este documento já está vinculado a outra empresa.")
      }
    }

    if (email && email !== company.email) {
      const emailUsed = await knex("companies")
        .where({ email })
        .andWhereNot({ id })
        .first()

      if (emailUsed) {
        throw new ErrorApplication("Este email já está vinculado a outra empresa.")
      }
    }

    if (subdomain && subdomain !== company.subdomain) {
      const subdomainUsed = await knex("companies")
        .where({ subdomain })
        .andWhereNot({ id })
        .first()

      if (subdomainUsed) {
        throw new ErrorApplication("Este subdomínio já está em uso.")
      }
    }

    const updatedData = {
      updated_at: now
    }

    if (name !== undefined) updatedData.name = name
    if (phone_number !== undefined) updatedData.phone_number = phone_number
    if (email !== undefined) updatedData.email = email
    if (address !== undefined) updatedData.address = address
    if (document !== undefined) updatedData.document = document
    if (plan_id !== undefined) updatedData.plan_id = plan_id
    if (subdomain !== undefined) updatedData.subdomain = subdomain

    await knex("companies").update(updatedData).where({ id })

    return res.status(200).json({ message: "Empresa atualizada com sucesso." })
  }

  async delete(req, res) {
    const { id } = req.params
    const { superadmin_id } = req.headers

    if (!superadmin_id) {
      throw new ErrorApplication("superadmin_id é obrigatório nos headers.", 400)
    }

    const company = await knex("companies").where({ id, superadmin_id }).first()
    if (!company) {
      throw new ErrorApplication("Empresa não encontrada ou você não tem permissão para deletá-la.", 404)
    }

    const professionalsCount = await knex("professionals")
      .where({ company_id: id })
      .count("id as count")
      .first()

    if (professionalsCount.count > 0) {
      throw new ErrorApplication(
        "Não é possível deletar esta empresa pois existem profissionais vinculados.",
        400
      )
    }

    await knex("companies").where({ id, superadmin_id }).del()

    return res.status(200).json({ message: "Empresa removida com sucesso." })
  }

  async index(req, res) {
    const { superadmin_id } = req.headers

    let companies
    
    if (superadmin_id) {
      companies = await knex("companies")
        .select("*")
        .where({ superadmin_id })
        .orderBy("name", "asc")
    } else {
      companies = await knex("companies")
        .select("*")
        .orderBy("name", "asc")
    }

    const companiesWithData = await Promise.all(
      companies.map(async (company) => {
        const professionalsCount = await knex("professionals")
          .where({ company_id: company.id })
          .count("id as count")
          .first()

        return {
          ...company,
          professionals_count: parseInt(professionalsCount.count) || 0
        }
      })
    )

    return res.status(200).json(companiesWithData)
  }

  async show(req, res) {
    const { id } = req.params

    const company = await knex("companies").where({ id }).first()

    if (!company) {
      throw new ErrorApplication("Empresa não encontrada.", 404)
    }

    const workingHours = await knex("company_working_hours")
      .where({ company_id: id })
      .orderBy("day_of_week", "asc")

    const professionals = await knex("professionals")
      .select("id", "name", "email", "position", "phone_number", "created_at")
      .where({ company_id: id })
      .orderBy("name", "asc")

    return res.status(200).json({
      ...company,
      working_hours: workingHours || [],
      professionals: professionals || []
    })
  }

  async getBySubdomain(req, res) {
    const { subdomain } = req.params
    
    if (!subdomain) {
      throw new ErrorApplication("O subdomínio é obrigatório.", 400)
    }
    
    const company = await knex("companies").where({ subdomain }).first()
    
    if (!company) {
      throw new ErrorApplication("Empresa não encontrada para este subdomínio.", 404)
    }
    
    return res.json({
      id: company.id,
      name: company.name,
      subdomain: company.subdomain,
      email: company.email,
      phone_number: company.phone_number
    })
  }
}

module.exports = new CompaniesController()
