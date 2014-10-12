
var IxPL = require('treed/rx/pl/ixdb')
  , QueuePL = require('treed/rx/pl/queuedb')
  , treed = require('treed/rx')

var uuid = require('../lib/uuid')

var kernelConfig = {
  null: null,
  'ipython': {
    type: 'ipython',
    language: 'python'
  },
  'gorilla': {
    type: 'gorilla',
    language: 'clojure'
  },
  'ijulia': {
    type: 'ipython',
    language: 'julia'
  }
}

module.exports = {
  // returns a listing of files, looks like
  // {"title": "string",
  //  "id": "...",
  //  "repl": null | 'ipython' | 'gorilla' | ?? }
  list: listFiles,

  // update a file
  update: updateFile,

  // create a new file, returns a loaded PL
  create: newFile,

  // returns a loaded PL
  get: getFile,

  // initialize files
  init: init,

  // load a file from id to done
  // load: load,
}

function updateFile(id, data, done) {
  listFiles(files => {
    var f
    saveFiles(
      files.map(file => {
        if (file.id !== id) return file
        f = file
        for (var name in data) {
          file[name] = data[name]
        }
        return file
      }), () => done(f))
  })
}

function init(file, pl, done) {
  var config = kernelConfig[file.repl]
  var plugins = [
    require('treed/rx/plugins/undo'),
    require('treed/rx/plugins/todo'),
    require('treed/rx/plugins/collapse'),
    require('treed/rx/plugins/clipboard'),
    require('treed/rx/plugins/types'),

    require('treed/rx/plugins/rebase'),
  ]
  if (config) {
    // repl
    plugins.unshift(require('../lib/plugin')(config.type, config.language))
  } else {
    plugins.unshift(require('treed/rx/plugins/ijs'))
  }

  var storeOptions = {
    data: {content: file.title, children: [{content: 'Add a child'}]},
    pl: pl,
  }

  treed.initStore(plugins, storeOptions, (err, store) => {
    if (err) {
      return done(err)
    }
//        var config = treed.viewConfig(store, plugins, null)
//        window.store = store
//        window.actions = config.view.actions

    done(null, store, plugins)
  })
}

function listFiles(done) {
  var val = localStorage['nm:files:list']
  if (!val) return done([])
  var items
  try {
    items = JSON.parse(localStorage['nm:files:list'])
  } catch (e) {
    console.warn('Failed to parse files list. Corrupted:')
    console.warn(localStorage['nm:files:list'])
    return done([])
  }
  done(items)
}

function saveFiles(files, done) {
  localStorage['nm:files:list'] = JSON.stringify(files)
  done && done()
}

function getFile(id, isNew, done) {
  if (arguments.length === 2) {
    done = isNew
    isNew = false
  }
  var pl = new QueuePL(new IxPL({prefix: 'nm:file:' + id}))
  done(pl)
}

/**
 * Takes a title, and a repl type
 */
function newFile(title, repl, done) {
  var file = {
    id: uuid(),
    title: title,
    repl: repl
  }
  listFiles(files =>
    saveFiles(files.concat([file]), () =>
      getFile(file.id, true, pl => done(file, pl))))
}

