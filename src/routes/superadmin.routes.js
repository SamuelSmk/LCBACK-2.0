const {Router} = require("express")
const superAdminRoutes = Router()

const superAdminController = require("../controllers/SuperAdminsController")

superAdminRoutes.post("/", superAdminController.create)
superAdminRoutes.get("/", superAdminController.index)
superAdminRoutes.get("/:id", superAdminController.show)
superAdminRoutes.put("/:id", superAdminController.update)
superAdminRoutes.delete("/:id", superAdminController.delete)

module.exports = superAdminRoutes
