
var IxPL = require('treed/rx/pl/ixdb')
  , QueuePL = require('treed/rx/pl/queuedb')
  , treed = require('treed/rx')
  , kernelConfig = require('./kernels')
  , Db = require('treed/rx/db')

var uuid = require('../lib/uuid')

module.exports = {
  // returns a listing of files, looks like
  // {"title": "string",
  //  "id": "...",
  //  "repl": null | 'ipython' | 'gorilla' | ?? }
  list: listFiles,

  // update a file
  update: updateFile,

  remove: removeFile,

  // create a new file, returns a loaded PL
  create: newFile,

  // returns a loaded PL
  get: getFile,

  // initialize files
  init: init,

  // fill a new file with data.
  populateFile: populateFile,
  importRaw: importRaw,

  // load a file from id to done
  // load: load,
}

function updateFile(id: string, data: any, done: (file: any) => void) {
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

type FileData = {
  main: {content: string; children: Array<any>};
  title: string;
  repl: string | void
}

function convertToFile(data: FileData | Array<any>): ?FileData {
  if (!Array.isArray(data)) {
    if (data.main && data.title) {
      return data
    }
    data = [data]
  }
  if (data.length === 1) {
    return {
      title: data[0].content,
      main: data[0],
      repl: 'none',
    }
  }
  return {
    title: 'Imported...',
    main: {
      content: 'Imported...',
      children: data,
    },
    repl: 'none',
  }
}

function importRaw(data, done) {
  if ('string' === typeof data) {
    try {
      data = JSON.parse(text)
    } catch (e) {
      return done(new Error('Invalid format'))
    }
  }
  importOne(data, done)
}

function importOne(data, done) {
  var fileData = convertToFile(data)
  if (!fileData) {
    return done(new Error("Invalid file format"))
  }
  newImport(fileData, (file, pl) => {
    populateFile(pl, fileData.main, (err) => {
      done(err, file)
    })
  })
}

function populateFile(pl, data, done) {
  var db = new Db(pl, [])

  db.init(data, function (err) {
    if (err) return done(err)

    done(null)
  })
}

function init(file, pl, defaultData, done) {
  if (arguments.length === 3) {
    done = defaultData
    defaultData = {content: file.title, children: [{content: 'Add a child'}]}
  }
  var config = kernelConfig[file.repl]
  var plugins = [
    require('treed/rx/plugins/undo'),
    require('treed/rx/plugins/todo'),
    require('treed/rx/plugins/collapse'),
    require('treed/rx/plugins/clipboard'),
    require('treed/rx/plugins/types'),
    require('treed/rx/plugins/window-switch'),

    require('treed/rx/plugins/rebase'),
  ]
  if (config && config.kernel) {
    // repl
    plugins.unshift(require('../lib/plugin')(config))
  }

  var storeOptions = {
    data: defaultData,
    pl: pl,
  }

  treed.initStore(plugins, storeOptions, (err, store) => {
    if (err) {
      return done(err)
    }

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
    created: Date.now(),
    opened: Date.now(),
    title: title,
    repl: repl
  }
  listFiles(files =>
    saveFiles(files.concat([file]), () =>
      getFile(file.id, true, pl => done(file, pl))))
}

function newImport(fileData, done) {
  var file = {
    id: uuid(),
  }
  for (var name in fileData) {
    if (name === 'main') continue;
    file[name] = fileData[name]
  }
  listFiles(files =>
    saveFiles(files.concat([file]), () =>
      getFile(file.id, true, pl => done(file, pl))))
}

function removeFile(id, done) {
  listFiles(files => saveFiles(files.filter(x => x.id !== id), done))
}

