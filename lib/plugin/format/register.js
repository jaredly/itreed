
var handlers = require('./handlers')

module.exports = function (handler, mime) {
  handlers.mime[mime] = handler
}

