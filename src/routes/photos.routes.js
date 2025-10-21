const { Router } = require('express');
const PhotosController = require('../controllers/PhotosController');
const { uploadLocal } = require('../configs/uploadLocal');

const photosRoutes = Router();
const photosController = new PhotosController();

// POST - Upload de fotos vinculadas a um produto (requer produto_id no body)
photosRoutes.post('/', uploadLocal.any(), photosController.create);

// GET - Lista todas as fotos de um produto (requer produto_id na query)
photosRoutes.get('/', photosController.index);

// GET - Busca uma foto específica pelo nome do arquivo
photosRoutes.get('/:filename', photosController.show);

// DELETE - Remove uma foto pelo ID
photosRoutes.delete('/:id', photosController.delete);

module.exports = photosRoutes;
