
export default {
  id: 'clojure',
  displayName: 'Clojure',
  server: 'jupyter', 
  kernel: 'nodejs',
  syntax: 'clojure',
  description: 'Connect to an nRepl server to evaluate clojure code! this actually has nothing to do with nodejs (other than that we\'re going through the jupyter-nodejs kernel)`
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

