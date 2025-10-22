const authConfig = require("../configs/auth")
const knex = require("../database/knex")
const { sign } =  require("jsonwebtoken")
const ErrorApplication = require("../utils/ErrorApplication")
const bcrypt = require("bcryptjs");

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

}


module.exports = SessionsController
