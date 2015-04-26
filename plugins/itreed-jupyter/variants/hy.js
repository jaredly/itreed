
export default {
  id: 'hy',
  displayName: 'Hy (lispy)',
  server: 'jupyter', 
  kernel: 'python2',
  syntax: 'clojure',
  description: 'Write code in `hy`, and it gets translated an run in your python runtime',
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
