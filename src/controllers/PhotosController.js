const fs = require('fs');
const path = require('path');
const { UPLOAD_FOLDER } = require('../configs/uploadLocal');
const AppError = require('../utils/appError');
const knex = require('../database/knex');

class PhotosController {
  /**
   * POST - Upload de uma ou múltiplas fotos vinculadas a um produto
   */
  async create(request, response) {
    const files = request.files;
    const { produto_id } = request.body;
    const { company_id } = request.headers;

    if (!company_id) {
      throw new AppError('É necessário enviar o ID da empresa', 400);
    }

    if (!produto_id) {
      throw new AppError('O ID do produto é obrigatório', 400);
    }

    if (!files || files.length === 0) {
      throw new AppError('Nenhuma foto foi enviada', 400);
    }

    // Verifica se a empresa existe
    const company = await knex('companies').where({ id: company_id }).first();
    if (!company) {
      throw new AppError('Empresa não encontrada', 404);
    }

    // Verifica se o produto existe e pertence à empresa
    const produto = await knex('produtos')
      .where({ id: produto_id, company_id: company_id })
      .first();
    if (!produto) {
      throw new AppError('Produto não encontrado ou não pertence a esta empresa', 404);
    }

    // Salva as informações das fotos no banco de dados
    const uploadedFiles = [];
    for (const file of files) {
      const [photo] = await knex('product_photos')
        .insert({
          company_id: company_id,
          produto_id: produto_id,
          filename: file.filename,
          original_name: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          url: `/photos/${file.filename}`
        })
        .returning('*');

      uploadedFiles.push(photo);
    }

    return response.status(201).json({
      message: 'Fotos enviadas com sucesso',
      files: uploadedFiles
    });
  }

  /**
   * GET - Lista todas as fotos de um produto
   */
  async index(request, response) {
    const { produto_id } = request.query;
    const { company_id } = request.headers;

    if (!company_id) {
      throw new AppError('É necessário enviar o ID da empresa', 400);
    }

    if (!produto_id) {
      throw new AppError('O ID do produto é obrigatório', 400);
    }

    // Lista fotos apenas da empresa e produto especificados
    const photos = await knex('product_photos')
      .where({ company_id, produto_id })
      .orderBy('created_at', 'desc');

    return response.json(photos);
  }

  /**
   * GET - Busca uma foto específica pelo nome
   */
  async show(request, response) {
    const { filename } = request.params;

    const filePath = path.join(UPLOAD_FOLDER, filename);

    // Verifica se o arquivo existe
    if (!fs.existsSync(filePath)) {
      throw new AppError('Foto não encontrada', 404);
    }

    // Retorna o arquivo
    return response.sendFile(filePath);
  }

  /**
   * DELETE - Remove uma foto pelo ID
   */
  async delete(request, response) {
    const { id } = request.params;

    // Busca a foto no banco
    const photo = await knex('product_photos').where({ id }).first();

    if (!photo) {
      throw new AppError('Foto não encontrada', 404);
    }

    const filePath = path.join(UPLOAD_FOLDER, photo.filename);

    // Remove o arquivo físico se existir
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove do banco de dados
    await knex('product_photos').where({ id }).delete();

    return response.json({ message: 'Foto removida com sucesso' });
  }
}

module.exports = PhotosController;
