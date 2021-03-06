
function makeNodeConfig(kernels) {
  const key = Object.keys(kernels)[0]
  const kernel = kernels[key]
  if (kernel.variants.default) {
    return {
      server: kernel.serverId,
      kernel: kernel.id,
      variant: 'default',
    }
  }
  return {
    server: kernel.serverId,
    kernel: kernel.id,
    variant: Object.keys(kernel.variants)[0]
  }
}

module.exports = config => ({
  toggleDisplayCollapse: function (id) {
    if (!arguments.length) id = this.view.active
    this.set(id, 'display_collapsed', !this.db.nodes[id].display_collapsed)
  },

  toggleEditorCollapse: function (id) {
    if (!arguments.length) id = this.view.active
    this.set(id, 'editor_collapsed', !this.db.nodes[id].editor_collapsed)
  },

  executeDeep: function (id) {
    if (!arguments.length && this.view.mode === 'visual') {
      return this.executeManyDeep()
    }
    if (!arguments.length) id = this.view.active
    var node = this.db.nodes[id]
    node.children.forEach((id) => {
      this.execute(id)
      this.executeDeep(id)
    })
  },

  executeMany: function () {
    if (this.view.mode !== 'visual') return
    this.startTransaction()
    this.view.selection.forEach(id => this.execute(id))
    this.stopTransaction()
    this.setMode('normal')
  },

  executeManyDeep: function () {
    if (this.view.mode !== 'visual') return
    this.startTransaction()
    this.view.selection.forEach(this.executeDeep.bind(this))
    this.stopTransaction()
    this.setMode('normal')
  },

  clearKernelError: function (server, kernel) {
    this.globals.itreed.kernelErrors[server + ':' + kernel] = false
    this.changed(this.events.kernelError(server, kernel))
  },

  executeAndAdd: function (id) {
    this.execute(id)
    this.createAfter(id)
    this.edit()
  },

  execute: function (id, histIx) {
    if (!arguments.length && this.view.mode === 'visual') {
      return this.executeMany()
    }
    if (!arguments.length) id = this.view.active
    var node = this.db.nodes[id]
    if (node.type !== 'ipython') return

    if (!node.itreed) {
      node.itreed = makeNodeConfig(this.globals.itreed.kernels)
    }

    const key = node.itreed.server + ':' + node.itreed.kernel
    const kernel = this.globals.itreed.kernels[key]
    if (!kernel) {
      this.globals.itreed.kernelErrors[key] = 'kernel not configured'
      this.changed(this.events.kernelError(node.itreed.server, node.itreed.kernel))
      return console.warn('kernel not set')
    }

    if (!kernel.session) {
      this.globals.itreed.kernelErrors[key] = 'kernel disconnected'
      this.changed(this.events.kernelError(node.itreed.server, node.itreed.kernel))
      return console.warn('kernel not connected')
    }

    // track where to refocus
    var refocus
    if (this.view.mode === 'insert') {
      refocus = document.activeElement
      document.activeElement.blur()
    }

    // TODO grab the ID from here
    if ('number' == typeof histIx) {
      this.update(id, {
        waiting: true,
      }, histIx)
    } else {
      histIx = this.update(id, {
        waiting: true,
      })
    }

    var content = node.content
    let cleared = false
    kernel.sendShell(content, node.itreed.variant, {
      start: () => {
        this.update(id, {
          started: Date.now(),
          session: kernel.session,
          executed: content,
          finished: null,
          waiting: false,
          display_collapsed: false,
          // outputs: [],
        }, histIx) // , true /* squash commit */)
      },
      output: (output) => {
        let orig = this.db.nodes[id].outputs
        if (!cleared || !orig) {
          orig = []
          cleared = true
        }
        let outputs = orig.concat([output])
        this.set(id, 'outputs', outputs, histIx) // , true /* squash commit */)

        if (output['json/live']) {
          var lid = output['json/live'].id

          kernel.onLive(lid, value => {
            var outputs = this.db.nodes[id].outputs
            for (var i=0; i<outputs.length; i++) {
              if (outputs[i]['json/live'] && outputs[i]['json/live'].id === lid) {
                outputs[i]['json/live'].value = value
              }
            }
            this.set(id, 'outputs', outputs, histIx)
          })
        }
      },
      end: () => {
        var finished = Date.now()
          , time = finished - this.db.nodes[id].started
        if (html5notify && document.hidden) {
          showDoneNotification(content, time)
        }
        let updater = {
          finished: finished,
          waiting: false,
        }
        if (!cleared) {
          updater.outputs = []
        }
        this.update(id, updater, histIx)
      }
    })

    if (refocus) {
      refocus.focus()
      this.setMode('insert')
    }
    return histIx
  },
})

// Notifications!!
var html5notify = false
if (typeof(window) !== 'undefined' && window.Notification && window.Notification.requestPermission) {
  if (window.Notification.permission === 'granted') {
    html5notify = true
  }
  /* TODO ask this via the kernel config
  window.Notification.requestPermission(permission => {
    if (permission === 'granted') html5notify = true
  })
  */
}

function showDoneNotification(text, time) {
  var secs = time / 1000
  var stime = parseInt(secs / 60) + ':' + (secs % 60)
  var n = new window.Notification("Code finished after " + stime + 's', {
    body: text.slice(0, 100),
  })
  setTimeout(() => n.close(), 10000)
}
