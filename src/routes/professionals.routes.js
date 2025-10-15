const {Router} = require("express")
const professionalsRoutes = Router()

const professionalsController = require("../controllers/ProfessionalsController")

professionalsRoutes.post("/", professionalsController.create)
professionalsRoutes.get("/", professionalsController.index)
professionalsRoutes.get("/:id", professionalsController.show)
professionalsRoutes.put("/:id", professionalsController.update)
professionalsRoutes.delete("/:id", professionalsController.delete)

module.exports = professionalsRoutes
