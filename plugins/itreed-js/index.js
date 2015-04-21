import Kernel from './kernel'
import Server from './server'

export default {
  id: 'js',
  displayName: 'in-browser js',
  defaultConfig() {
    return {}
  },
  Kernel,
  Server
}


