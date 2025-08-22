const express = require("express");
const { MediaController } = require("../controllers/media.controller");

const router = express.Router();
const ctrl = new MediaController();


router.get("/", ctrl.list);

router.post("/", ctrl.create);

router.put("/:id", ctrl.update);

router.delete("/:id", ctrl.remove);

module.exports = router;
