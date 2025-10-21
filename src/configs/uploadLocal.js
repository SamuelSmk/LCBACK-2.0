const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Diretório onde as fotos serão armazenadas
const UPLOAD_FOLDER = path.resolve(__dirname, '..', '..', 'uploads', 'photos');

// Criar a pasta se não existir
if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
}

// Configuração do storage do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_FOLDER);
  },
  filename: (req, file, cb) => {
    // Gera um nome único para o arquivo
    const fileHash = crypto.randomBytes(10).toString('hex');
    const fileName = `${fileHash}-${file.originalname}`;
    cb(null, fileName);
  }
});

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de arquivo inválido. Apenas imagens são permitidas.'));
  }
};

const uploadLocal = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Limite de 5MB por arquivo
  }
});

module.exports = { uploadLocal, UPLOAD_FOLDER };
