const express = require("express");
const { AccountsController } = require("../controllers/accounts.controller");

const router = express.Router();
const ctrl = new AccountsController();

// health-check style ping for this resource
router.get("/_ping", (_req, res) => res.json({ ok: true, scope: "accounts" }));

// public login (no JWT required)
router.post("/login", ctrl.login);

module.exports = router;
