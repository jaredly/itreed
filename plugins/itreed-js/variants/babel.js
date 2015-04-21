
import jsx from '../jsx'

export default {
  id: 'babel',
  displayName: 'Babel (es6+)',
  server: 'js',
  kernel: 'js',
  syntax: 'javascript',
  init(kernel, done) {
    try {
      jsx('class Awesome {}')
    } catch (e) {
      return done(new Error('babel compilation is missing or misconfigured'))
    }
    kernel.ctx.jsx = jsx
    done()
  },
  preprocess(code) {
    return jsx(code)
  }
}

