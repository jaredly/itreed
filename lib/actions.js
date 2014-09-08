
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
  execute: function (id) {
    if (!arguments.length) id = this.view.active
    var node = this.db.nodes[id]
    if (node.type !== 'ipython') return
    document.activeElement.blur()
    this.update(id, {
      started: Date.now(),
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
      pyout: (m) => add({
        output_type: 'pyout',
        suppressable: m.suppressable,
        vega: m.content.data['json/vega'],
        text: m.content.data['text/plain'],
        latex: m.content.data['text/latex'],
        html: m.content.data['text/html'],
        png: m.content.data['image/png'],
      }, 'pyout', m),
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
      display_data: (m) => add({
        output_type: 'display_data',
        metadata: m.content.metadata,
        latex: m.content.data['text/latex'],
        vega: m.content.data['json/vega'],
        png: m.content.data['image/png'],
        text: m.content.data['text/plain'],
        html: m.content.data['text/html'],
      }),
      status: (m) => null,
    }, () => {
      this.update(id, {
        loading: false,
        finished: Date.now(),
      })
    })
  },
}
