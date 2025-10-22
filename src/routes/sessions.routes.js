const {Router} = require("express")


const SessionsController = require("../controllers/sessionsController")

const sessionsController = new SessionsController()



const sessionRoutes = Router()


sessionRoutes.post("/",sessionsController.create)
sessionRoutes.post("/admin",sessionsController.createAdmin)


module.exports = sessionRoutes