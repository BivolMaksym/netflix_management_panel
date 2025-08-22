const express = require("express");
const { ProfilesController } = require("../controllers/profiles.controller");

const router = express.Router();
const ctrl = new ProfilesController();

router.get("/", ctrl.list);

router.post("/", ctrl.create);

router.put("/:id", ctrl.update);

router.delete("/:id", ctrl.remove);

module.exports = router;
