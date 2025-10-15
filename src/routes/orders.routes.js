const {Router} = require("express")
const ordersRoutes = Router()

const ordersController = require("../controllers/OrdersController")

ordersRoutes.post("/", ordersController.create)
ordersRoutes.get("/", ordersController.index)
ordersRoutes.get("/:id", ordersController.show)
ordersRoutes.put("/:id", ordersController.update)
ordersRoutes.patch("/:id/status", ordersController.updateStatus)
ordersRoutes.delete("/:id", ordersController.delete)

module.exports = ordersRoutes
