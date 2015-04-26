
import async from 'async'
import {plugins, variants} from '../registrar'

export default function handleConfig(config, docid, done) {
  const tasks = {}
  for (let name in config) {
    if (!plugins[name]) {
      throw new Error(`Invalid config! Unknown plugin ${name}`)
    }
    tasks[name] = initServer.bind(null, name, config[name], docid)
  }

  async.parallel(tasks, done)
}

function tout(fn, timeout, done) {
  let _tout = setTimeout(() => {
    if (!_tout) return
    _tout = null
    console.log('TIMEOUT')
    done(new Error(`Timeout! after ${timeout} ms`))
  }, timeout)
  fn(function () {
    if (_tout === null) {
      console.warn('Resolved after timeout')
      debugger
      return
    }
    clearTimeout(_tout)
    _tout = null
    done.apply(this, arguments)
  })
}

function initServer(name, config, docid, done) {
  const s = new plugins[name].Server(config.server)

  tout(s.init.bind(s), 1000, (err, spec) => {
    s.initError = err

    initKernels(s, spec, name, config, docid, done)
  })
}

function initDefaultKernel(s, spec, name, docid, done) {
  const k = new plugins[name].Kernel(s, null, spec && spec.kernelspecs[spec.default], docid)
  k.serverId = name
  k.id = spec && spec.default
  if (s.initError) {
    return done(null, {server: s, kernels: {default: k}})
  }
  return tout(k.init.bind(k), 5000, err => {
    k.initError = err
    if (err) {
      k.status = 'errored'
      return done(null, {
        server: s,
        kernels: {
          [k.id]: k
        }
      })
    }

    tout(k.initVariants.bind(k, (variants[name] || {})[k.id]), 1000, err => {
      return done(null, {
        server: s,
        kernels: {
          [k.id]: k
        }
      })
    })
  })
}

function initKernels(s, spec, name, config, docid, done) {
  if (!config.kernels) {
    return initDefaultKernel(s, spec, name, docid, done)
  }

  const tasks = {}
  for (let sname in config.kernels) {
    if (!spec || !spec.kernelspecs[sname]) {
      tasks[sname] = next => {
        const k = new plugins[name].Kernel(s, config.kernels[sname], spec.kernelspecs[sname], docid)
        k.initError = new Error(`Kernel not available from server ${name}: ${sname}`)
        k.status = 'errored'
        next(null, k)
      }
      continue
    }
    tasks[sname] = next => {
      const k = new plugins[name].Kernel(s, config.kernels[sname], spec.kernelspecs[sname], docid)
      k.serverId = name
      k.id = sname
      if (s.initError) return next(null, k)
      tout(k.init.bind(k), 1000, err => {
        k.initError = err
        if (err) {
          k.status = 'errored'
          return next(null, k)
        }
        tout(k.initVariants.bind(k, (variants[name] || {})[k.id]), 1000, err => {
          next(null, k)
        })
      })
    }
  }

  async.parallel(tasks, (err, kernels) => {
    done(err, {server: s, kernels})
  })
}

