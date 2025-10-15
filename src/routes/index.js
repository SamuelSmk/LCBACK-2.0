const {Router} = require("express")
const routes = Router()

const superAdminRoute = require("./superadmin.routes")
const companiesRoute = require("./companies.routes")
const professionalsRoute = require("./professionals.routes")
const workingHoursRoute = require("./workingHours.routes")
const productsRoute = require("./products.routes")
const clientsRoute = require("./clients.routes")
const ordersRoute = require("./orders.routes")

routes.use("/superadmin", superAdminRoute)
routes.use("/companies", companiesRoute)
routes.use("/professionals", professionalsRoute)
routes.use("/working-hours", workingHoursRoute)
routes.use("/products", productsRoute)
routes.use("/clients", clientsRoute)
routes.use("/orders", ordersRoute)

module.exports = routes
