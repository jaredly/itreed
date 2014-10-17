
var global = this

function send(name, data) {
  postMessage({name: name, data: data})
}

function cloneE(e) {
  return {
    name: e.name,
    message: e.message,
    stack: e.stack,
  }
}

var HANDLERS = {
  'eval': function (payload) {
    var res, err
    try {
      res = eval(payload.text)
    } catch (e) {
      err = cloneE(e)
    }
    send('eval', {id: payload.id, error: err, result: res})
  },

  'go': function (payload) {
    var fn, err
    try {
      eval('fn = ' + payload.what)
    } catch (e) {
      console.log('er!', e)
      console.log(e)
      console.log(payload)
      return send('go', {id: payload.id, error: cloneE(e)})
    }
    try {
      fn(function () {
        send('go', {
          id: payload.id,
          args: [null].concat([].slice.call(arguments))
        })
      })
    } catch (e) {
      console.log('er!', e)
      console.log(e)
      send('go', {id: payload.id, error: cloneE(e)})
    }
  }
}

onmessage = function (evt) {
  var data = evt.data
  HANDLERS[data.name](data.data)
}

