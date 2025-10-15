const knex = require("../database/knex");
const moment = require("moment-timezone");
const ErrorApplication = require("../utils/ErrorApplication");

class CompanyWorkingHoursController {
  async index(req, res) {
    const company_id = req.headers['company_id'];

    if (!company_id) {
      throw new ErrorApplication("company_id é obrigatório nos headers", 400);
    }

    const workingHours = await knex("company_working_hours")
      .where({ company_id })
      .orderBy("day_of_week");

    return res.json(workingHours);
  }

  async create(req, res) {
    const company_id = req.headers['company_id'];
    const { workingHours } = req.body;

    if (!company_id) {
      throw new ErrorApplication("company_id é obrigatório nos headers", 400);
    }

    if (!workingHours || !Array.isArray(workingHours)) {
      throw new ErrorApplication("workingHours deve ser um array", 400);
    }

    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss");

    // Validar formato dos horários
    workingHours.forEach(hour => {
      if (!hour.start_time || !hour.end_time || hour.day_of_week === undefined) {
        throw new ErrorApplication("Dados de horário incompletos", 400);
      }

      const startTime = moment(hour.start_time, "HH:mm", true);
      const endTime = moment(hour.end_time, "HH:mm", true);

      if (!startTime.isValid() || !endTime.isValid()) {
        throw new ErrorApplication("Formato de horário inválido. Use HH:mm", 400);
      }

      if (hour.day_of_week < 0 || hour.day_of_week > 6) {
        throw new ErrorApplication("Dia da semana inválido (0-6)", 400);
      }
    });

    // Deletar horários existentes
    await knex("company_working_hours").where({ company_id }).delete();

    // Inserir novos horários
    const hoursToInsert = workingHours.map(hour => ({
      company_id,
      day_of_week: hour.day_of_week,
      start_time: hour.start_time,
      end_time: hour.end_time,
      is_open: hour.is_open ?? true,
      created_at: now,
      updated_at: now
    }));

    await knex("company_working_hours").insert(hoursToInsert);

    const insertedHours = await knex("company_working_hours")
      .where({ company_id })
      .orderBy("day_of_week");

    return res.status(201).json({ 
      message: "Horários criados com sucesso",
      workingHours: insertedHours
    });
  }

  async update(req, res) {
    const company_id = req.headers['company_id'];
    const { workingDays } = req.body;

    if (!company_id) {
      throw new ErrorApplication("company_id é obrigatório nos headers", 400);
    }

    if (!workingDays || !Array.isArray(workingDays) || workingDays.length === 0) {
      throw new ErrorApplication("workingDays deve ser um array com pelo menos um item", 400);
    }

    // Validar formato dos horários para cada dia
    workingDays.forEach(day => {
      if (!day.id) {
        throw new ErrorApplication("Cada dia deve ter um ID", 400);
      }

      if (day.start_time) {
        const startTime = moment(day.start_time, "HH:mm", true);
        if (!startTime.isValid()) {
          throw new ErrorApplication(`Formato de horário de início inválido para o dia ID ${day.id}. Use HH:mm`, 400);
        }
      }

      if (day.end_time) {
        const endTime = moment(day.end_time, "HH:mm", true);
        if (!endTime.isValid()) {
          throw new ErrorApplication(`Formato de horário de término inválido para o dia ID ${day.id}. Use HH:mm`, 400);
        }
      }
    });

    const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss");
    const updatedWorkingHours = [];

    // Usar transação para garantir que todos os dias sejam atualizados ou nenhum
    await knex.transaction(async (trx) => {
      for (const day of workingDays) {
        // Verificar se o horário existe e pertence à empresa
        const workingHour = await trx("company_working_hours")
          .where({ id: day.id, company_id })
          .first();

        if (!workingHour) {
          throw new ErrorApplication(`Horário com ID ${day.id} não encontrado ou não pertence a esta empresa`, 404);
        }

        // Preparar dados para atualização
        const updateData = {
          updated_at: now
        };

        // Adicionar apenas os campos que foram fornecidos
        if (day.start_time !== undefined) updateData.start_time = day.start_time;
        if (day.end_time !== undefined) updateData.end_time = day.end_time;
        if (day.is_open !== undefined) updateData.is_open = day.is_open ? 1 : 0;

        // Atualizar o registro
        await trx("company_working_hours")
          .where({ id: day.id, company_id })
          .update(updateData);

        // Buscar o registro atualizado
        const updatedWorkingHour = await trx("company_working_hours")
          .where({ id: day.id })
          .first();

        updatedWorkingHours.push(updatedWorkingHour);
      }
    });

    return res.json({
      message: "Horários atualizados com sucesso",
      workingHours: updatedWorkingHours
    });
  }

  async delete(req, res) {
    const { id } = req.params;
    const company_id = req.headers['company_id'];

    if (!company_id) {
      throw new ErrorApplication("company_id é obrigatório nos headers", 400);
    }

    const workingHour = await knex("company_working_hours")
      .where({ id, company_id })
      .first();

    if (!workingHour) {
      throw new ErrorApplication("Horário não encontrado", 404);
    }

    await knex("company_working_hours").where({ id, company_id }).delete();

    return res.json({ message: "Horário deletado com sucesso" });
  }

  async show(req, res) {
    const { id } = req.params;
    const company_id = req.headers['company_id'];

    if (!company_id) {
      throw new ErrorApplication("company_id é obrigatório nos headers", 400);
    }

    const workingHour = await knex("company_working_hours")
      .where({ id, company_id })
      .first();

    if (!workingHour) {
      throw new ErrorApplication("Horário não encontrado", 404);
    }

    return res.json(workingHour);
  }
}

module.exports = new CompanyWorkingHoursController();
