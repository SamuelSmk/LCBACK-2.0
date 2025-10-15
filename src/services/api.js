const axios = require("axios");

 const api = axios.create({
  baseURL: "https://apievolution.linkeats.app",
});

module.exports = api;