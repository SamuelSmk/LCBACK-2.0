const knex = require("../database/knex");
const ErrorApplication = require("../utils/ErrorApplication");
const moment = require("moment-timezone");
const bcrypt = require("bcrypt");

class SuperAdminsController {
  async create(req, res) {
    const { name, email, password, document, phone_number } = req.body;
    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss");

    if (!name || !email || !password || !document || !phone_number) {
      throw new ErrorApplication("Todos os campos são obrigatórios.");
    }
    
    // Verificar se já existe um super admin com o mesmo email ou documento
    const existingAdmin = await knex("super_admins")
      .where({ email })
      .orWhere({ document })
      .first();
      
    if (existingAdmin) {
      if (existingAdmin.email === email) {
        throw new ErrorApplication("Já existe um administrador com este email.");
      }
      if (existingAdmin.document === document) {
        throw new ErrorApplication("Já existe um administrador com este documento.");
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [admin_id] = await knex("super_admins")
      .insert({
        name,
        email,
        password: hashedPassword,
        document,
        phone_number,
        created_at: now,
        updated_at: now,
      })
      .returning("id");

    // Garantir que o ID seja tratado como um número inteiro
    const idValue = typeof admin_id === 'object' && admin_id.id ? admin_id.id : admin_id;
    const superAdmin = await knex("super_admins").where({ id: idValue }).first();

    return res.status(201).json(superAdmin);
  }

  async update(req, res) {
    const { id } = req.params;
    const { name, email, password, document, phone_number } = req.body;
    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss");

    const superAdmin = await knex("super_admins").where({ id }).first();

    if (!superAdmin) {
      throw new ErrorApplication("Super Admin não encontrado.", 404);
    }

    // Verificar se email já existe em outro registro
    if (email && email !== superAdmin.email) {
      const emailExists = await knex("super_admins")
        .where({ email })
        .andWhereNot({ id })
        .first();
        
      if (emailExists) {
        throw new ErrorApplication("Este email já está em uso.");
      }
    }

    // Verificar se documento já existe em outro registro
    if (document && document !== superAdmin.document) {
      const documentExists = await knex("super_admins")
        .where({ document })
        .andWhereNot({ id })
        .first();
        
      if (documentExists) {
        throw new ErrorApplication("Este documento já está em uso.");
      }
    }

    const updatedData = {
      updated_at: now,
    };

    // Adicionar apenas os campos fornecidos
    if (name !== undefined) updatedData.name = name;
    if (email !== undefined) updatedData.email = email;
    if (document !== undefined) updatedData.document = document;
    if (phone_number !== undefined) updatedData.phone_number = phone_number;

    // Atualizar a senha, se fornecida
    if (password) {
      updatedData.password = await bcrypt.hash(password, 10);
    }

    await knex("super_admins").update(updatedData).where({ id });

    return res.status(200).json({ message: "Super Admin atualizado com sucesso." });
  }

  async delete(req, res) {
    const { id } = req.params;

    const superAdmin = await knex("super_admins").where({ id }).first();

    if (!superAdmin) {
      throw new ErrorApplication("Super Admin não encontrado.", 404);
    }

    // Verificar se existem empresas vinculadas
    const companiesCount = await knex("companies")
      .where({ superadmin_id: id })
      .count("id as count")
      .first();

    if (companiesCount.count > 0) {
      throw new ErrorApplication(
        "Não é possível deletar este Super Admin pois existem empresas vinculadas a ele.",
        400
      );
    }

    await knex("super_admins").where({ id }).del();

    return res.status(200).json({ message: "Super Admin removido com sucesso." });
  }

  async index(req, res) {
    const superAdmins = await knex("super_admins")
      .select("id", "name", "email", "document", "phone_number", "created_at", "updated_at")
      .orderBy("name", "asc");

    return res.status(200).json(superAdmins);
  }

  async show(req, res) {
    const { id } = req.params;

    const superAdmin = await knex("super_admins")
      .select("id", "name", "email", "document", "phone_number", "created_at", "updated_at")
      .where({ id })
      .first();

    if (!superAdmin) {
      throw new ErrorApplication("Super Admin não encontrado.", 404);
    }

    // Buscar empresas vinculadas
    const companies = await knex("companies")
      .select("id", "name", "email", "phone_number", "subdomain", "created_at")
      .where({ superadmin_id: id })
      .orderBy("name", "asc");

    return res.status(200).json({
      ...superAdmin,
      companies: companies || []
    });
  }
}

module.exports = new SuperAdminsController();
