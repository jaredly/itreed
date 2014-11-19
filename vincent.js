
var extend = require('../extend')

function Chart(options) {
  this.options = extend({
  }, options)
}

function Line(options) {
  Chart.call(this, options)

  var x_type = this._is_datetime ? 'time' : 'linear'
  this.scales = this.scales.concat([
    new Scale({
      name: 'x',
      type: x_type,
      range: 'width',
      domain: DataRef(data='table', field="data.idx")
    }),
    new Scale({
      name: 'y',
      range: 'height',
      nice: True,
      domain: new DataRef({
        data: 'table',
        field: "data.val"
      })
    }),
    new Scale({
      name: 'color',
      type: 'ordinal',
      domain: new DataRef({
        data: 'table',
        field: 'data.col'
      }),
      range: 'category20'
    })
  ])

  // Axes
  this.axes = this.axes.concat([
    new Axis({type: 'x', scale: 'x'}),
    new Axis({type: 'y', scale: 'y'})
  ])

  // Marks
  var from_ = new MarkRef({
      data: 'table',
      transform: [new Transform({type: 'facet', keys: ['data.col']})]
  })
  var enter_props = new PropertySet({
      x: new ValueRef({scale: 'x', field: "data.idx"}),
      y: new ValueRef({scale: 'y', field: "data.val"}),
      stroke: new ValueRef({scale: "color", field: 'data.col'}),
      stroke_width: new ValueRef({value: 2})
  })
  var marks = [new Mark({
    type: 'line',
    properties: new MarkProperties(enter: enter_props)
  })]
  var mark_group = new Mark({
    type: 'group',
    from_: from_,
    marks: marks
  })
  this.marks.append(mark_group)
}

