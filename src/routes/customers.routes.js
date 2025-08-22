const express = require("express");
const { CustomersController } = require("../controllers/customers.controller");

const router = express.Router();
const ctrl = new CustomersController();

// create customer account
router.post("/", ctrl.create);
// update customer account
router.put("/:id", ctrl.update);
// delete customer account
router.delete("/:id", ctrl.remove);

module.exports = router;
