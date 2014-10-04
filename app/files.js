
var IxPL = require('treed/rx/pl/ixdb')
var QueuePL = require('treed/rx/pl/queuedb')

var uuid = require('../lib/uuid')

module.exports = {
  // returns a listing of files, looks like
  // {"title": "string",
  //  "id": "...",
  //  "repl": null | 'ipython' | 'gorilla' | ?? }
  list: listFiles,

  // create a new file, returns a loaded PL
  create: newFile,

  // returns a loaded PL
  get: getFile,
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
  done()
}

function getFile(file, isNew, done) {
  if (arguments.length === 2) {
    done = isNew
    isNew = false
  }
  var pl = new QueuePL(new IxPL({prefix: 'nm:file:' + file.id}))
  done(file, pl)
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
      getFile(file, true, done)))
}

