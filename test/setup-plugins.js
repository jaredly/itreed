import JS from '../plugins/itreed-js'
import JUP from '../plugins/itreed-jupyter'
import jsx from '../plugins/itreed-js/jsx'
import ajax from '../plugins/itreed-jupyter/ajax'

import itreed from '..'

/**
 * Registers plugins with itreed
 */
export default function setup() {

  itreed.register(JS)
  itreed.registerVariant({
    id: 'babel',
    server: 'js',
    kernel: 'js',
    syntax: 'javascript',
    init(kernel, done) {
      try {
        jsx('class Awesome {}')
      } catch (e) {
        return done(new Error('babel compilation is missing or misconfigured'))
      }
      done()
    },
    preprocess(code) {
      return jsx(code)
    }
  })

  itreed.registerVariant({
    // using Himera! TODO get this actually working :)
    id: 'clojurescript',
    server: 'js',
    kernel: 'js',
    syntax: 'clojure',
    config: {
      compiler: {
        title: 'Himera URL',
        defaultValue: 'http://localhost:4432/compile',
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
        // TODO kernel -> load cljs core files into the frame...
        kernel.ctx.loadJS(config.compiler + '/js/repl.js', err => {
          if (err) return done(err)
          try {
            // kernel.ctx.himera.client.repl.go();
            kernel.ctx.goog.require('cljs.core');
            kernel.ctx.goog.provide('cljs.user');
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
    }
  })

  itreed.register(JUP)

  itreed.registerVariant({
    id: 'hy',
    server: 'jupyter', 
    kernel: 'python2',
    syntax: 'clojure',
    init(kernel, done) {
      let err = null
      kernel._sendShell('%load_ext hymagic', {
        error() {
          err = m.content
        },
      }, () => {
        done(err)
      })
    },
    preprocess(code) {
      return '%%hylang\n' + code
    }
  })
}
