const {Router} = require("express")
const clientRoutes = Router()

const clientController = require("../controllers/ClientsController")

clientRoutes.post("/", clientController.create)
clientRoutes.get("/", clientController.index)
clientRoutes.get("/document/:document", clientController.findByDocument)
clientRoutes.get("/phone/:phone", clientController.findByPhone)
clientRoutes.get("/:id", clientController.show)
clientRoutes.put("/:id", clientController.update)
clientRoutes.delete("/:id", clientController.delete)

module.exports = clientRoutes
