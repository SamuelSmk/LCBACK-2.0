const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Configuração do Cloudinary com credenciais diretamente no código
cloudinary.config({
  cloud_name: 'ddl9w1a1n',  // Substitua com seu Cloud Name
  api_key: '779947657686257',  // Substitua com sua API Key
  api_secret: 'jQEV3n8MeD4ug-6ah8fitd4axzo',  // Substitua com seu API Secret
});

// Configuração do Multer para armazenar arquivos na memória
const storage = multer.memoryStorage();

const upload = multer({ storage });

module.exports = { cloudinary, upload };
