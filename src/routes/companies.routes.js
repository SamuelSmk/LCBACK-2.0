const {Router} = require("express")
const companiesRoutes = Router()

const companiesController = require("../controllers/CompaniesController")

companiesRoutes.get("/subdomain/:subdomain", companiesController.getBySubdomain)
companiesRoutes.post("/", companiesController.create)
companiesRoutes.get("/", companiesController.index)
companiesRoutes.get("/:id", companiesController.show)
companiesRoutes.put("/:id", companiesController.update)
companiesRoutes.delete("/:id", companiesController.delete)

module.exports = companiesRoutes
