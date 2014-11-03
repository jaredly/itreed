
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
    this.view.selection.forEach(this.execute.bind(this))
  },

  executeManyDeep: function () {
    if (this.view.mode !== 'visual') return
    this.view.selection.forEach(this.executeDeep.bind(this))
  },

  clearKernelError: function () {
    this.globals.kernelError = false
    this.changed(this.events.kernelError())
  },

  execute: function (id) {
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
    this.update(id, {
      waiting: true,
    })

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
        }) // , true /* squash commit */)
      },
      output: (output) => {
        var outputs = this.db.nodes[id].outputs.concat([output])
        this.set(id, 'outputs', outputs) // , true /* squash commit */)

        if (output['json/live']) {
          var lid = output['json/live'].id

          this.globals.kernel.onLive(lid, value => {
            var outputs = this.db.nodes[id].outputs
            for (var i=0; i<outputs.length; i++) {
              if (outputs[i]['json/live'] && outputs[i]['json/live'].id === lid) {
                outputs[i]['json/live'].value = value
              }
            }
            this.set(id, 'outputs', outputs)
          })
        }
      },
      end: () => {
        this.update(id, {
          finished: Date.now(),
          waiting: false,
        }) // , true /* squash commit */)
      }
    })

    if (refocus) {
      refocus.focus()
      this.setMode('insert')
    }
  },
})
