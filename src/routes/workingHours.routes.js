const {Router} = require("express")
const workingHoursRoutes = Router()

const workingHoursController = require("../controllers/CompanyWorkingHoursController")

workingHoursRoutes.post("/", workingHoursController.create)
workingHoursRoutes.get("/", workingHoursController.index)
workingHoursRoutes.get("/:id", workingHoursController.show)
workingHoursRoutes.put("/", workingHoursController.update)
workingHoursRoutes.delete("/:id", workingHoursController.delete)

module.exports = workingHoursRoutes
