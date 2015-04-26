
import Kernel from './kernel'
import Server from './server'

export default {
  id: 'jupyter',
  displayName: 'Jupyter',
  description: `This adapter connects to a Jupyter (ipython) server that you can access to. You need to make sure that --NotebookApp.allow_hosts is set so that this web page can communicate with it.`,
  serverConfig: {
    host: {
      title: 'Host',
      type: 'text',
      defaultValue: 'localhost:8888',
    }
  },
  Kernel,
  Server
}

