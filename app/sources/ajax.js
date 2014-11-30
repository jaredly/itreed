/* @flow */

type Cb = <T>(err: ?Error, result?: T) => void;

module.exports = {
  post: send.bind(null, 'POST'),
  patch: send.bind(null, 'PATCH'),
  get: function get<T>(url: string, headers: any, done: (err: ?Error, result?: T) => void) {
    if (arguments.length === 2) {
      done = headers
      headers = {}
    }
    send('GET', url, headers, null, done)
  },
}

function send<T>(method: string, url: string, headers: any, data: any, done: (err: ?Error, result?: T) => void) {
  var x = new XMLHttpRequest()
  x.open(method, url)
  for (var name in headers) {
    x.setRequestHeader(name, headers[name])
  }
  x.onreadystatechange = function () {
    if (this.readyState !== 4) return
    var data
    try {
      data = JSON.parse(this.responseText)
    } catch (e) {
      return done(new Error('Unexpected server response'))
    }
    done(null, data)
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


