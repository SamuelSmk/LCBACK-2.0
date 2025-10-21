const {Router} = require("express")
const ordersRoutes = Router()

const ordersController = require("../controllers/OrdersController")

// Rotas principais de pedidos
ordersRoutes.post("/", ordersController.create)
ordersRoutes.get("/", ordersController.index)

// Rota para listar pedidos por cliente (deve vir antes da rota genérica /:id)
ordersRoutes.get("/client/:client_id", ordersController.listByClient)

ordersRoutes.get("/:id", ordersController.show)
ordersRoutes.put("/:id", ordersController.update)
ordersRoutes.patch("/:id/status", ordersController.updateStatus)
ordersRoutes.delete("/:id", ordersController.delete)

// Rotas para itens do pedido
ordersRoutes.post("/:order_id/items", ordersController.addMultipleItems)
ordersRoutes.delete("/:order_id/items/:item_id", ordersController.removeItem)
ordersRoutes.put("/:order_id/items/:item_id/quantity", ordersController.updateItemQuantity)

module.exports = ordersRoutes
