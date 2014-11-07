
var React = require('treed/node_modules/react')
  , uuid = require('../lib/uuid')
  , _cache = {}

module.exports = {
  mime: 'js/react',

  display: function (value, meta) {
    if (_cache[value]) {
      return _cache[value]
    }
    return <em>Evaluate to see React Component</em>;
  },

  format: function (value) {
    if (React.isValidComponent(value)) {
      var id = uuid()
      _cache[id] = value
      return id
    }
  },
}

