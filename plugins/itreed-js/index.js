import Kernel from './kernel'
import Server from './server'

export default {
  id: 'js',
  displayName: 'Browser Runtime',
  description: `This adapter allows you to run javascript (or compile-to-javascript) code directly in your browser.`,
  defaultConfig() {
    return {}
  },
  Kernel,
  Server
}


