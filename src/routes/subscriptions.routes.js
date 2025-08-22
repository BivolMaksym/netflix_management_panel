const express = require("express");
const { SubscriptionsController } = require("../controllers/subscriptions.controller");
const router = express.Router();
const ctrl = new SubscriptionsController();

router.get("/", ctrl.list);       

router.post("/", ctrl.create);       

router.put("/quality", ctrl.changeQualityBody); 

router.delete("/:id", ctrl.cancel);      

module.exports = router;
