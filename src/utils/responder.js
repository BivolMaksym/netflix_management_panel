const js2xmlparser = require("js2xmlparser");

class Responder {
  static send(req, res, payload, root = "data") {
    const accept = req.headers.accept || "application/json";
    if (accept.includes("application/xml")) {
      const xml = js2xmlparser.parse(root, payload);
      res.set("Content-Type", "application/xml");
      return res.send(xml);
    }
    return res.json(payload);
  }
}

module.exports = { Responder };
