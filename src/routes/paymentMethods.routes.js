const { Router } = require("express")
const PaymentMethodsController = require("../controllers/PaymentMethodsController")

const paymentMethodsRoutes = Router()

paymentMethodsRoutes.post("/", PaymentMethodsController.create)
paymentMethodsRoutes.get("/", PaymentMethodsController.index)
paymentMethodsRoutes.get("/categories", PaymentMethodsController.categories)
paymentMethodsRoutes.get("/:id", PaymentMethodsController.show)
paymentMethodsRoutes.put("/:id", PaymentMethodsController.update)
paymentMethodsRoutes.delete("/:id", PaymentMethodsController.delete)

module.exports = paymentMethodsRoutes
