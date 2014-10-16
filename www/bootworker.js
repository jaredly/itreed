
var global = this

function send(name, data) {
  postMessage({name: name, data: data})
}

var HANDLERS = {
  'eval': function (payload) {
    send({
      id: payload.id,
      value: eval(payload.text)
    })
  },
}

onmessage = function (evt) {
  var data = evt.data
  HANDLERS[data.name](data.data)
}

