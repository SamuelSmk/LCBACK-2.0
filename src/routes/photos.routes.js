const { Router } = require('express');
const PhotosController = require('../controllers/PhotosController');
const { uploadLocal } = require('../configs/uploadLocal');

const photosRoutes = Router();
const photosController = new PhotosController();

// POST - Upload de fotos (aceita múltiplas fotos com qualquer nome de campo)
photosRoutes.post('/', uploadLocal.any(), photosController.create);

// GET - Lista todas as fotos
photosRoutes.get('/', photosController.index);

// GET - Busca uma foto específica pelo nome
photosRoutes.get('/:filename', photosController.show);

// DELETE - Remove uma foto
photosRoutes.delete('/:filename', photosController.delete);

module.exports = photosRoutes;
