# Dockerfile para o Backend - Versão 1
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de pacote
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 3333

# Comando para iniciar a aplicação
CMD ["npm", "start"]
