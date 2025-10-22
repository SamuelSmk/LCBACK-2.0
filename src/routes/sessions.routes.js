const {Router} = require("express")


const SessionsController = require("../controllers/sessionsController")

const sessionsController = new SessionsController()



const sessionRoutes = Router()


sessionRoutes.post("/",sessionsController.create)
sessionRoutes.post("/admin",sessionsController.createAdmin)
sessionRoutes.post("/request-password-reset", sessionsController.requestPasswordReset)
sessionRoutes.post("/verify-code", sessionsController.verifyCode)
sessionRoutes.post("/reset-password", sessionsController.resetPassword)


module.exports = sessionRoutes