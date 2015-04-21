
import ajax from '../../itreed-jupyter/ajax'

export default {
  id: 'clojurescript',
  displayName: 'ClojureScript',
  server: 'js',
  kernel: 'js',
  syntax: 'clojure',
  config: {
    compiler: {
      title: 'Himera URL',
      defaultValue: 'http://localhost:4432',
      type: 'text',
    },
  },

  asyncPreprocess: true,
  init(kernel, config, done) {
    if (!config.compiler) return done(new Error('must specify host for clojure transpiler'))
    ajax.send({
      method: 'POST',
      headers: {
        'Content-type': 'application/clojure',
      },
      url: config.compiler + '/compile',
      data: `{:expr (+ 2 3)}`,
      plain: true,
    }, (err, response) => {
      if (err) return done(new Error('failed to talk to cljs compile server'))
      if (response !== '{:js "cljs.core._PLUS_.call(null,2,3)"}') {
        console.log(response)
        return done(new Error('Invalid response from cljs compile server'))
      }

      kernel.ctx.loadJS(config.compiler + '/js/repl.js', err => {
        if (err) return done(err)
        try {
          // kernel.ctx.himera.client.repl.go();
          kernel.ctx.goog.require('cljs.core');
          kernel.ctx.goog.provide('cljs.user');
          kernel.ctx.cljs.core.set_print_fn_BANG_(val => kernel.ctx.display(val, 'stdout'))
        } catch (e) {
          debugger
          return done(new Error('Failed to initialize clojurescript runtime'))
        }
        done()
      })
      // done()
    })
  },

  preprocess(code, config, done) {
    ajax.send({
      method: 'POST',
      headers: {
        'Content-type': 'application/clojure',
      },
      url: config.compiler + '/compile',
      data: `{:expr (do ${code})}`,
      plain: true,
    }, (err, response) => {
      if (err) return done(err)
      if (!response.match(/^\{:js "/) || response.slice(-2) !== '"}') {
        return done(new Error('Unexpected response from server: ' + response))
      }
      try {
        response = eval(response.slice('{: js'.length, -1))
      } catch (e) {
        return done(new Error('Unexpected response from server: ' + response))
      }
      done(null, response)
    })
  },

  rawOutput(kernel, value) {
    kernel.ctx.display(kernel.ctx.cljs.core.pr_str(value), 'text/plain')
  },

  /*
  postprocess(kernel, output) {
    return kernel.ctx.cljs.core.pr_str(output)
  },
  */
}
