
export default {
  id: 'babel',
  displayName: 'Babel (es6+)',
  server: 'jupyter', 
  kernel: 'nodejs',
  syntax: 'javascript',
  init(kernel, done) {
    let err = null
    kernel._sendShell('%load_ext babel', {
      error() {
        err = m.content
      },
    }, () => {
      done(err)
    })
  },
  preprocess(code) {
    return '%%babel\n' + code
  }
}
