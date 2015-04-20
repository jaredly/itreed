
module.exports = {
  post: send.bind(null, 'POST'),
  patch: send.bind(null, 'PATCH'),
  del: send.bind(null, 'DELETE'),
  get: function get (url, headers, done) {
    if (arguments.length === 2) {
      done = headers
      headers = {}
    }
    send('GET', url, headers, null, done)
  },
}

function send (method, url, headers, data, done) {
  var x = new XMLHttpRequest()
  x.open(method, url)
  if (!headers) headers = {}
  if (method[0] === 'P') {
    headers['Content-type'] = 'application/json'
  }
  headers['Accept'] = 'application/json'
  for (var name in headers) {
    x.setRequestHeader(name, headers[name])
  }
  x.responseType = 'json'
  x.onload = _ => {
    done(x.status > 210 ? new Error(`Unexpected status: ${x.status}`) : null, x.response)
  }

  x.onerror = function () {
    done(new Error('Failed to connect'))
  }
  x.onabort = function () {
    done(new Error('Connection cancelled'))
  }
  if (data) {
    x.send(JSON.stringify(data))
  } else {
    x.send()
  }
}

