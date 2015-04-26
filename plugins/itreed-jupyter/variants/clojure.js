
export default {
  id: 'clojure',
  displayName: 'Clojure',
  server: 'jupyter', 
  kernel: 'nodejs',
  syntax: 'clojure',
  config: {
    port: {
      title: 'nRepl port',
      defaultValue: '55431',
      type: 'text',
    },
  },
  init(kernel, config, done) {
    let err = null
    kernel._sendShell('%load_ext clojure ' + config.port, {
      error(m) {
        err = m.content
      },
    }, () => {
      done(err)
    })
  },
  preprocess(code) {
    return '%%clojure\n' + code
  }
}

