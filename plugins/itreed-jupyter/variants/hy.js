
export default {
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
}
