const { Router } = require("express")
const AdditionalController = require("../controllers/AdditionalController")

const additionalRoutes = Router()

additionalRoutes.post("/", AdditionalController.create)
additionalRoutes.get("/", AdditionalController.index)
additionalRoutes.get("/:id", AdditionalController.show)
additionalRoutes.put("/:id", AdditionalController.update)
additionalRoutes.delete("/:id", AdditionalController.delete)
additionalRoutes.get("/product/:product_id", AdditionalController.findByProduct)

module.exports = additionalRoutes
