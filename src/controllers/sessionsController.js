const authConfig = require("../configs/auth")
const knex = require("../database/knex")
const { sign } =  require("jsonwebtoken")
const ErrorApplication = require("../utils/ErrorApplication")
const bcrypt = require("bcryptjs");
const moment = require("moment-timezone");

class SessionsController {

  async create(req, res) {
    const { email, password } = req.body;
    
    try {
      // Verifica se o usuário existe
      const user = await knex("professionals").where({ email }).first();
    
      if (!user) {
        throw new ErrorApplication("E-mail ou senha incorreta", 401);
      }
    
      // Verifica se a senha está correta
      const passwordMatch = await bcrypt.compare(password, user.password);
    
      if (!passwordMatch) {
        throw new ErrorApplication("E-mail ou senha incorreta", 401);
      }
    
      // Gera o token JWT após a verificação de senha
      const { expiresIn, secret } = authConfig.jwt;
      const token = sign({}, secret, {
        subject: String(user.id),
        expiresIn,
      });
    
      // Retorna o usuário e o token
      return res.status(200).json({ user, token });
    } catch (error) {
      console.error("Erro na autenticação:", error);
      return res.status(error.statusCode || 401).json({
        status: "error",
        message: error.message || "Erro na autenticação"
      });
    }
  }


async createAdmin(req, res) {
  const { email, password } = req.body;

  try {
    const admin = await knex("super_admins").where({ email }).first();

    if (!admin) {
      throw new ErrorApplication("E-mail ou senha incorreta", 401);
    }

    const passwordMatched = await bcrypt.compare(password, admin.password);

    if (!passwordMatched) {
      throw new ErrorApplication("E-mail ou senha incorreta", 401);
    }

    const { expiresIn, secret } = authConfig.jwt;
    const token = sign({ id: admin.id }, secret, { expiresIn });

    return res.status(200).json({ admin, token });
  } catch (error) {
    console.error("Erro ao tentar fazer login:", error);
    return res.status(error.statusCode || 401).json({
      status: "error",
      message: error.message || "Erro ao tentar fazer login"
    });
  }
}

  // Solicitar código de recuperação de senha
  async requestPasswordReset(req, res) {
    const { email } = req.body;

    try {
      if (!email) {
        throw new ErrorApplication("E-mail é obrigatório", 400);
      }

      // Verificar se o usuário existe (tanto em professionals quanto em clients)
      let user = await knex("professionals").where({ email }).first();
      let userType = "professional";

      if (!user) {
        user = await knex("clients").where({ email }).first();
        userType = "client";
      }

      if (!user) {
        // Por segurança, não revelar se o e-mail existe ou não
        return res.status(200).json({ 
          message: "Se o e-mail existir, um código de recuperação será enviado." 
        });
      }

      // Gerar código de 6 dígitos
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = moment().tz("America/Sao_Paulo").add(30, 'seconds').format("YYYY-MM-DD HH:mm:ss");
      const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss");

      // Salvar código no banco (criar tabela password_reset_codes se não existir)
      await knex("password_reset_codes").insert({
        email,
        code: resetCode,
        user_type: userType,
        user_id: user.id,
        expires_at: expiresAt,
        used: false,
        created_at: now
      });

      // Por enquanto, mostrar o código no console
      console.log(`🔐 CÓDIGO DE RECUPERAÇÃO DE SENHA:`);
      console.log(`📧 E-mail: ${email}`);
      console.log(`🔢 Código: ${resetCode}`);
      console.log(`⏰ Expira em: ${expiresAt}`);
      console.log(`👤 Tipo de usuário: ${userType}`);
      console.log(`-----------------------------------`);

      return res.status(200).json({ 
        message: "Código de recuperação enviado com sucesso. Verifique o console." 
      });

    } catch (error) {
      console.error("Erro ao solicitar recuperação de senha:", error);
      return res.status(error.statusCode || 500).json({
        status: "error",
        message: error.message || "Erro interno do servidor"
      });
    }
  }

  // Verificar código de recuperação de senha
  async verifyCode(req, res) {
    const { email, code } = req.body;

    try {
      if (!email || !code) {
        throw new ErrorApplication("E-mail e código são obrigatórios", 400);
      }

      const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss");

      // Buscar código válido
      const resetRequest = await knex("password_reset_codes")
        .where({ 
          email, 
          code, 
          used: false 
        })
        .where('expires_at', '>', now)
        .first();

      if (!resetRequest) {
        throw new ErrorApplication("Código inválido ou expirado", 400);
      }

      console.log(`✅ CÓDIGO VERIFICADO COM SUCESSO:`);
      console.log(`📧 E-mail: ${email}`);
      console.log(`🔢 Código: ${code}`);
      console.log(`👤 Tipo de usuário: ${resetRequest.user_type}`);
      console.log(`-----------------------------------`);

      return res.status(200).json({ 
        message: "Código válido!",
        valid: true
      });

    } catch (error) {
      console.error("Erro ao verificar código:", error);
      return res.status(error.statusCode || 500).json({
        status: "error",
        message: error.message || "Erro interno do servidor"
      });
    }
  }

  // Verificar código e resetar senha
  async resetPassword(req, res) {
    const { email, code, newPassword } = req.body;

    try {
      if (!email || !code || !newPassword) {
        throw new ErrorApplication("E-mail, código e nova senha são obrigatórios", 400);
      }

      if (newPassword.length < 6) {
        throw new ErrorApplication("A nova senha deve ter pelo menos 6 caracteres", 400);
      }

      const now = moment().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss");

      // Buscar código válido
      const resetRequest = await knex("password_reset_codes")
        .where({ 
          email, 
          code, 
          used: false 
        })
        .where('expires_at', '>', now)
        .first();

      if (!resetRequest) {
        throw new ErrorApplication("Código inválido ou expirado", 400);
      }

      // Hash da nova senha
      const hashedPassword = await bcrypt.hash(newPassword, 8);

      // Atualizar senha do usuário
      const table = resetRequest.user_type === "professional" ? "professionals" : "clients";
      await knex(table)
        .where({ id: resetRequest.user_id })
        .update({ 
          password: hashedPassword,
          updated_at: now
        });

      // Marcar código como usado
      await knex("password_reset_codes")
        .where({ id: resetRequest.id })
        .update({ used: true });

      console.log(`✅ SENHA RESETADA COM SUCESSO:`);
      console.log(`📧 E-mail: ${email}`);
      console.log(`👤 Tipo de usuário: ${resetRequest.user_type}`);
      console.log(`-----------------------------------`);

      return res.status(200).json({ 
        message: "Senha alterada com sucesso!" 
      });

    } catch (error) {
      console.error("Erro ao resetar senha:", error);
      return res.status(error.statusCode || 500).json({
        status: "error",
        message: error.message || "Erro interno do servidor"
      });
    }
  }

}


module.exports = SessionsController
