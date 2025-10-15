const {Router} = require("express")
const productRoutes = Router()

const productController = require("../controllers/ProductsController")

productRoutes.post("/", productController.create)
productRoutes.get("/", productController.index)
productRoutes.get("/categories", productController.categories)
productRoutes.get("/:id", productController.show)
productRoutes.put("/:id", productController.update)
productRoutes.delete("/:id", productController.delete)

module.exports = productRoutes
