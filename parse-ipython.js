
module.exports = {
  fromStr: fromStr,
  toStr: toStr,
  parseSections: parseSections,
}

function fromStr(str) {
  try {
    var data = JSON.parse(str)
  } catch (e) {
    return new Error("Failed to parse document")
  }
  var allCells = [].concat.apply([], data.worksheets.map(worksheet => worksheet.cells))
  return allCells.map(cellToNode)
}

function cellToNode(cell) {
  if (cell.cell_type === 'code') {
    return {
      content: cell.input.join('\n'),
      type: 'ipython',
      language: cell.language,
      // TODO: preserve prompt number?
      outputs: pyToNmOutputs(cell.outputs),
      children: [],
    }
  }
  if (cell.cell_type === 'markdown') {
    return {
      type: 'base',
      content: cell.source.join('\n'),
      children: [],
    }
  }
  if (cell.cell_type === 'heading') {
    return {
      type: 'base',
      content: toHeading(cell.source.join('\n'), cell.level),
      children: [],
    }
  }
}

function toHeading(text, level) {
  var pre = ''
  for (var i=0; i<level; i++) {
    pre += '#'
  }
  return pre + ' ' + text
}

function toStr(trees) {
}

