
var esprima = require('esprima')
  , escodegen = require('escodegen')

  , uniquity = require('./uniquity')
  , makeOutput = require('./make-output')

module.exports = execute

function execute(content, window, callbacks) {
  var num = window._ih.length
  window._ih.push(content)
  callbacks.start()

  var body = preprocess(content, window, callbacks, num)

  try {
    var res = window.eval(body)
  } catch (e) {
    callbacks.output({
      type: 'error',
      name: e.name,
      message: e.message,
      traceback: e.stack
    })
    callbacks.end()
    return
  }

  // update the magic vars
  if (undefined !== res) {
    window._oh[num] = res
    window.___ = window.__
    window.__ = window._
    window._ = res
  }
  callbacks.output(makeOutput(res))

  callbacks.end()
}

function inject(tree, window, suffix, injecting) {
  var replace = {}
  for (var name in injecting) {
    replace[name] = '_' + name + suffix
  }
  var needed = uniquity(tree, replace)
  needed.forEach(name => {
    window[replace[name]] = injecting[name]
  })
}

function preprocess(content, window, callbacks, num) {
  var tree = esprima.parse(content)

  inject(tree, window, num, {
    go: window._go.bind(null, callbacks.output),
    goEval: window._goEval.bind(null, callbacks.output),
    display: (what, mime) => callbacks.output(makeOutput(what, mime)),
    console: {
      log: function () {
        callbacks.output(makeOutput([].slice.call(arguments)))
      }
    }
  })

  return escodegen.generate(tree)
}

