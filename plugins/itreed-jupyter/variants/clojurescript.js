
export default {
  id: 'clojurescript',
  displayName: 'Clojurescript',
  server: 'jupyter', 
  kernel: 'nodejs',
  syntax: 'clojure',
  config: {
    compiler: {
      title: 'Himera URL',
      defaultValue: 'http://localhost:4432',
      type: 'text',
    },
  },
  init(kernel, config, done) {
    let err = null
    kernel._sendShell('%load_ext clojurescript ' + config.compiler, {
      error() {
        err = m.content
      },
    }, () => {
      done(err)
    })
  },
  preprocess(code) {
    return '%%clojurescript\n' + code
  }
}
