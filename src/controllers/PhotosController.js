const fs = require('fs');
const path = require('path');
const { UPLOAD_FOLDER } = require('../configs/uploadLocal');
const AppError = require('../utils/appError');

class PhotosController {
  /**
   * POST - Upload de uma ou múltiplas fotos
   */
  async create(request, response) {
    const files = request.files;

    if (!files || files.length === 0) {
      throw new AppError('Nenhuma foto foi enviada', 400);
    }

    // Retorna informações sobre os arquivos enviados
    const uploadedFiles = files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      url: `/photos/${file.filename}` // URL para acessar a foto
    }));

    return response.status(201).json({
      message: 'Fotos enviadas com sucesso',
      files: uploadedFiles
    });
  }

  /**
   * GET - Lista todas as fotos
   */
  async index(request, response) {
    try {
      const files = fs.readdirSync(UPLOAD_FOLDER);

      const photos = files.map(filename => {
        const filePath = path.join(UPLOAD_FOLDER, filename);
        const stats = fs.statSync(filePath);

        return {
          filename,
          size: stats.size,
          createdAt: stats.birthtime,
          url: `/photos/${filename}`
        };
      });

      return response.json(photos);
    } catch (error) {
      throw new AppError('Erro ao listar fotos', 500);
    }
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
   * DELETE - Remove uma foto
   */
  async delete(request, response) {
    const { filename } = request.params;

    const filePath = path.join(UPLOAD_FOLDER, filename);

    // Verifica se o arquivo existe
    if (!fs.existsSync(filePath)) {
      throw new AppError('Foto não encontrada', 404);
    }

    // Remove o arquivo
    fs.unlinkSync(filePath);

    return response.json({ message: 'Foto removida com sucesso' });
  }
}

module.exports = PhotosController;
