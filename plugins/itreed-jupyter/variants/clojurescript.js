
export default {
  id: 'clojurescript',
  displayName: 'Clojurescript',
  server: 'jupyter', 
  kernel: 'nodejs',
  syntax: 'clojure',
  description: `Transpile clojurescript to javascript using a Himera server. This then gets evaluated in the NodeJS runtime`,
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
