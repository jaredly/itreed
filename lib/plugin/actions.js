
module.exports = {
  toggleDisplayCollapse: function (id) {
    if (!arguments.length) id = this.view.active
    this.set(id, 'display_collapsed', !this.db.nodes[id].display_collapsed)
  },
  typeIpython: function (id) {
    if (!arguments.length) id = this.view.active
    this.set(id, 'type', 'ipython')
  },
  typeNormal: function (id) {
    if (!arguments.length) id = this.view.active
    this.set(id, 'type', 'base')
  },
  executeDeep: function (id) {
    if (!arguments.length) id = this.view.active
    var node = this.db.nodes[id]
    node.children.forEach((id) => {
      this.execute(id)
      this.executeDeep(id)
    })
  },
  execute: function (id) {
    if (!arguments.length) id = this.view.active
    var node = this.db.nodes[id]
    if (node.type !== 'ipython') return
    if (!this.globals.kernel) return console.warn('kernel not set')
    document.activeElement.blur()
    this.update(id, {
      started: Date.now(),
      session: this.globals.kernel.session,
      finished: null,
      loading: true,
      display_collapsed: false,
      outputs: [],
    })
    var add = (output, type, message) => {
      console.log('got', output, type, message)
      var outputs = this.db.nodes[id].outputs.concat([output])
      this.set(id, 'outputs', outputs)
    }
    this.globals.kernel.sendShell(this.db.nodes[id].content, {
      pyout: (m) => {
        var data = m.content.data
        data.output_type = 'pyout'
        data.suppressable = m.suppressable
        add(data, 'pyout', m)
      },
      stream: (m) => add({
        output_type: 'stream',
        stream: m.content.name,
        text: m.content.data,
      }, 'stream', m),
      pyerr: (m) => add({
        output_type: 'pyerr',
        ename: m.content.ename,
        evalue: m.content.evalue,
        traceback: m.content.traceback,
      }, 'pyerr', m),
      display_data: (m) => {
        var data = m.content.data
        data.output_type = 'display_data'
        data.metadata = m.content.metadata,
        data.suppressable = m.suppressable
        add(data, 'display_data', m)
      },
      status: (m) => null,
    }, () => {
      this.update(id, {
        loading: false,
        finished: Date.now(),
      })
    })
  },
}
