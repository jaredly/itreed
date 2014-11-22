
// Notifications!!
var html5notify = false
if (window.Notification && window.Notification.requestPermission) {
  window.Notification.requestPermission(permission => {
    if (permission === 'granted') html5notify = true
  })
}

function showDoneNotification(text, time) {
  var secs = time / 1000
  var stime = parseInt(secs / 60) + ':' + (secs % 60)
  var n = new window.Notification("Code finished after " + stime + 's', {
    body: text.slice(0, 100),
  })
  setTimeout(() => n.close(), 10000)
}

module.exports = (type, language) => ({
  toggleDisplayCollapse: function (id) {
    if (!arguments.length) id = this.view.active
    this.set(id, 'display_collapsed', !this.db.nodes[id].display_collapsed)
  },

  executeDeep: function (id) {
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

  clearKernelError: function () {
    this.globals.kernelError = false
    this.changed(this.events.kernelError())
  },

  execute: function (id, histIx) {
    if (!arguments.length) id = this.view.active
    var node = this.db.nodes[id]
    if (node.type !== 'ipython') return

    if (!this.globals.kernel) {
      this.globals.kernelError = 'kernel not configured'
      this.changed(this.events.kernelError())
      return console.warn('kernel not set')
    }
    if (!this.globals.kernel.session) {
      this.globals.kernelError = 'kernel disconnected'
      this.changed('kernel-error')
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
    this.globals.kernel.sendShell(content, {
      start: () => {
        this.update(id, {
          started: Date.now(),
          session: this.globals.kernel.session,
          executed: content,
          finished: null,
          waiting: false,
          display_collapsed: false,
          outputs: [],
        }, histIx) // , true /* squash commit */)
      },
      output: (output) => {
        var outputs = this.db.nodes[id].outputs.concat([output])
        this.set(id, 'outputs', outputs, histIx) // , true /* squash commit */)

        if (output['json/live']) {
          var lid = output['json/live'].id

          this.globals.kernel.onLive(lid, value => {
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
        this.update(id, {
          finished: finished,
          waiting: false,
        }, histIx) // , true /* squash commit */)
      }
    })

    if (refocus) {
      refocus.focus()
      this.setMode('insert')
    }
    return histIx
  },
})
