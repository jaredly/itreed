
import kernelConfig from './kernel-config'

module.exports = (config, doc) => ({
  asyncInit: function (store, done) {
    store._globals.itreed = {
      kernels: {},
      kernelErrors: {},
      loading: true,
      num: 0,
    }

    kernelConfig(config, store.db.root, (err, servers) => {
      store._globals.itreed.loading = false

      let numKernels = 0
      let multiKernels = false

      for (let sname in servers) {
        for (let kname in servers[sname].kernels) {
          const kernel = servers[sname].kernels[kname]
          numKernels += 1
          store._globals.itreed.kernels[sname + ':' + kname] = kernel
          kernel.on('session', () => {
            store.changed(store.events.kernelSession(kernel.serverId, kernel.id))
          })
          kernel.on('status', () => {
            store.changed(store.events.kernelStatus(kernel.serverId, kernel.id))
          })
        }
      }

      // if only one kernel, code editors don't show the "which editor am I"
      // floater
      store._globals.itreed.multiKernels = numKernels

      done()
    })

    /*

    var K = config.kernel;

    var kernel = store._globals.kernel = new K(store.db.root, null, config.language)
    var host = config && config.hosts && config.hosts[kernel.type]
    store._globals.kernelError = false
    kernel.on('session', () => {
      store.changed(store.events.kernelSession())
    })
    kernel.on('status', () => {
      store.changed(store.events.kernelStatus())
    })
    if (host || !config.remote) {
      if (host && host.indexOf(':') === -1) {
        host = 'localhost:' + host
      }
      setTimeout(() => {
        kernel.init(host, () => {
        })
      }, 0);
    }
    */

  },

  teardown: function (store) {
    const kernels = store._globals.itreedKernels
    if (!kernels) return
    kernels.forEach(kernel => kernel.teardown())
  },

  actions: require('./actions')(config),

  getters: {
    kernels: function () {
      return this.globals.itreed.kernels
    },
    kernelStatus: function (server, kernel) {
      if (!this.globals.itreed.kernels[server + ':' + kernel]) return
      return this.globals.itreed.kernels[server + ':' + kernel].status
    },
    kernelHost: function (server, kernel) {
      if (!this.globals.itreed.kernels[server + ':' + kernel]) return
      return this.globals.itreed.kernels[server + ':' + kernel].config.host
    },
    kernelSession: function (server, kernel) {
      if (!this.globals.itreed.kernels[server + ':' + kernel]) return
      return this.globals.itreed.kernels[server + ':' + kernel].session
    },
    kernelError: function (server, kernel) {
      return this.globals.itreed.kernelErrors[server + ':' + kernel]
      // return this.globals.kernelError
    },
  },

  events: {
    kernels: () => 'kernels',
    kernelSession: (server, kernel) => `kernel-session:${server}:${kernel}`,
    kernelStatus: (server, kernel) => `kernel-status:${server}:${kernel}`,
    kernelError: (server, kernel) => `kernel-error:${server}:${kernel}`,
  },
})

