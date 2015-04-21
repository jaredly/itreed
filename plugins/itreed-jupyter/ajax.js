
module.exports = {
  post: (url, headers, data, done) => send({
    method: 'POST',
    headers,
    url,
    data
  }, done),
  patch: (url, data, done) => send({
    method: 'PATCH',
    url,
    data
  }, done),
  del: (url, done) => send({
    method: 'DELETE',
    url,
  }, done),
  get(url, headers, done) {
    if (arguments.length === 2) {
      done = headers
      headers = {}
    }
    send({
      method: 'GET',
      url,
      headers,
    }, done)
  },
  send,
}

function send (options, done) {
  if (!options.url) {
    throw new Error('url required')
  }
  if (!options.method) {
    throw new Error('method required')
  }
  var x = new XMLHttpRequest()
  x.open(options.method, options.url)
  const headers = options.headers || {}
  if (options.method[0] === 'P' && !headers['Content-type']) {
    headers['Content-type'] = 'application/json'
  }
  if (!options.plain) {
    headers['Accept'] = 'application/json'
    x.responseType = 'json'
  } else {
    headers['Accept'] = 'text/plain'
    x.responseType = 'text'
  }

  for (var name in headers) {
    x.setRequestHeader(name, headers[name])
  }
  x.onload = _ => {
    done(x.status > 210 ? new Error(`Unexpected status: ${x.status}`) : null, x.response)
  }

  x.onerror = function () {
    done(new Error('Failed to connect'))
  }
  x.onabort = function () {
    done(new Error('Connection cancelled'))
  }
  if (options.data) {
    let data = options.data
    if ('string' !== typeof data) {
      data = JSON.stringify(data)
    }
    x.send(data)
  } else {
    x.send()
  }
}

