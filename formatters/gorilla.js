
function makeGorilla(data, nextid) {
  var rich = {}
  nextid = nextid || 0
  if (data.type === 'vega') {
    var id = (nextid++)
    rich[id] = data
    return ['<span class="rich-' + id + '"></span>', nextid, rich]
  }
  if (data.type === 'html') {
    return [data.content, nextid, {}]
  }
  if (data.type !== 'list-like') {
    return [escape(data.value), nextid, {}]
  }

  var items = data.items.map((item) => {
    var data = makeGorilla(item, nextid)
    nextid = data[1]
    for (var id in data[2]) {
      rich[id] = data[2][id]
    }
    return data[0]
  })
  var html = data.open + items.join(data.separator) + data.close
  return [html, nextid, rich]
}

