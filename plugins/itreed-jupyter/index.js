
import Kernel from './kernel'
import Server from './server'

export default {
  id: 'jupyter',
  displayName: 'Jupyter',
  serverConfig: {
    host: {
      title: 'Host',
      type: 'string',
      defaultValue: 'localhost:8888',
    }
  },
  Kernel,
  Server
}

