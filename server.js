// server.js
require("dotenv").config();
const { App } = require("./src/app");

const PORT = process.env.PORT || 4000;

const app = new App().app;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
