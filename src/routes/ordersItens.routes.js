const { Router } = require("express")
const OrdersItensController = require("../controllers/OrdersItensController")

const ordersItensRoutes = Router()

// Rotas para itens do pedido
ordersItensRoutes.post('/:order_id/items', OrdersItensController.addMultipleItems) // Adicionar múltiplos itens
ordersItensRoutes.get('/:order_id/items', OrdersItensController.listItems) // Listar itens do pedido
ordersItensRoutes.delete('/:order_id/items/:item_id', OrdersItensController.removeItem) // Remover item
ordersItensRoutes.put('/:order_id/items/:item_id/quantity', OrdersItensController.updateItemQuantity) // Atualizar quantidade
ordersItensRoutes.put('/:order_id/items/:item_id/price', OrdersItensController.updateItemPrice) // Atualizar preço

module.exports = ordersItensRoutes
