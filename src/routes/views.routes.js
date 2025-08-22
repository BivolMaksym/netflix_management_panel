const express = require("express");
const { ViewsController } = require("../controllers/views.controller");
const router = express.Router();

const ctrl = new ViewsController();

router.get("/preferences-anon", ctrl.getPreferencesAnon);  
router.get("/watch-stats", ctrl.getWatchStats);            

module.exports = router;
