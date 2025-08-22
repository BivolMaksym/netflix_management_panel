class BaseController {
  ok(res, body) {
    return res.status(200).json(body);
  }
  created(res, body) {
    return res.status(201).json(body);
  }
}
module.exports = { BaseController };
