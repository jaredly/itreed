
var uuid = require('./uuid')

var _objs = {}

module.exports = {
  register: function (obj) {
    var id = uuid()
    _objs[id] = obj
    return id
  },
  display: function (id) {
    return <strong>Howdy</strong>
  },
}


