import Kernel from './kernel'
import Server from './server'

export default {
  id: 'js',
  displayName: 'Browser Runtime',
  defaultConfig() {
    return {}
  },
  Kernel,
  Server
}


