
import jsx from '../jsx'

export default {
  id: 'babel',
  displayName: 'Babel (es6+)',
  server: 'js',
  kernel: 'js',
  syntax: 'javascript',
  description: 'Transpile code using babel to take advantage of es6/7/+ syntactic awesome',
  init(kernel, done) {
    try {
      jsx('class Awesome {}')
    } catch (e) {
      console.error('Babel initialization error:', e)
      return done(new Error('babel compilation is missing or misconfigured'))
    }
    kernel.ctx.jsx = jsx
    done()
  },
  preprocess(code) {
    return jsx(code)
  }
}

