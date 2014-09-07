
module.exports = {
  fromNotebook: fromNotebook,
  toNotebook: toNotebook,
}

function arstr(arr) {
  if ('string' === typeof arr) return arr
  return arr.join('')
}

function fromNotebook(cells) {
  var data = []
  var orphans = {}
  cells.forEach((cell) => {
    var node = {
      collapsed: !!cell.collapsed,
      children: cell.children,
    }
    switch (cell.cell_type) {
      case 'markdown':
        node.type = 'base'
        node.content = arstr(cell.source)
        break;
      case 'heading':
        node.type = 'base'
        node.content = '# ' + arstr(cell.source)
        break;
      case 'code':
        node.type = 'ipython'
        node.content = arstr(cell.input)
        node.language = cell.language
        node.outputs = cell.outputs || []
        break;
      default:
        console.warn('Unknown cell type encountered', cell)
    }
    if (!cell.parent) {
      data.push(node)
    } else {
      orphans[cell.treed_id] = node
    }
  })
  data.forEach((node) => {
    if (!node.children) return
    for (var i=0; i<node.children.length; i++) {
      node.children[i] = orphans[node.children[i]]
    }
  })
  return data
}

function toNotebook(dump) {
}

