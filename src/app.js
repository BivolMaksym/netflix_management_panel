const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const accountsRoutes = require("./routes/accounts.routes.js");
const customersRoutes = require("./routes/customers.routes");
const profilesRoutes = require("./routes/profiles.routes");
const mediaRoutes = require("./routes/media.routes");
const subscriptionsRoutes = require("./routes/subscriptions.routes");
const viewsRoutes = require("./routes/views.routes");
const { Auth } = require("./utils/auth");
const { errorMiddleware } = require("./utils/apiError"); 

class App {
  constructor() {
    this.app = express();
    this.configure();
    this.mountRoutes();
    this.mountErrors();
  }

  configure() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(morgan("dev"));
  }

  mountRoutes() {
    // health
    this.app.get("/api/health", (_req, res) => res.json({ ok: true }));

    // PUBLIC (login lives here)
    this.app.use("/api/accounts", accountsRoutes);
    // PROTECTED 
    this.app.use("/api/media", Auth.middleware, mediaRoutes);
    this.app.use("/api/profiles", Auth.middleware, profilesRoutes);
    this.app.use("/api/subscriptions", Auth.middleware, subscriptionsRoutes);
    this.app.use("/api/customers", Auth.middleware, customersRoutes);
    this.app.use("/api/views", Auth.middleware, viewsRoutes);

  }

  mountErrors() {
    this.app.use((req, res) =>
      res.status(404).json({ status: 404, error: "not_found", message: "Route not found." })
    );
    this.app.use(errorMiddleware);
  }
}

module.exports = { App };
