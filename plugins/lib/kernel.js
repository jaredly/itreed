
import async from 'async'
import EventEmitter from 'eventemitter3'

export default class Kernel extends EventEmitter {
  constructor(server, config, spec, docid) {
    super()
    this.server = server
    this.config = config || {}
    if (!this.config.variants) {
      this.config.variants = {default: true}
    }
    if (!Object.keys(this.config.variants).length) {
      this.config.variants = {default: true}
    }
    this.status = 'disconnected'
    this.docid = docid
    this.spec = spec
    this.title = spec && spec.spec.display_name
    this.language = spec && spec.spec.language
    this.username = 'username'
  }

  init(done) {
    this.initVariants(done)
  }

  initVariants(variants, done) {
    this.variants = {}
    // this.variantObjs = variants
    if (!this.config.variants || !variants) {
      this.variants.default = true
      return done()
    }
    const vnames = Object.keys(this.config.variants)
    if (!vnames.length) {
      this.variants.default = true
      return done()
    }
    const tasks = vnames.map(name => next => {
      if (name === 'default') {
        this.variants.default = true
        return next()
      }
      if (variants[name].config) {
        variants[name].init(this, this.config.variants[name], err => {
          if (err) {
            console.log('FAILED TO INIT')
            console.log(err)
          }
          this.variants[name] = err || variants[name]
          next()
        })
      } else {
        variants[name].init(this, err => {
          if (err) {
            console.log('FAILED TO INIT')
            console.log(err)
          }
          this.variants[name] = err || variants[name]
          next()
        })
      }
    })
    async.parallel(tasks, done)
  }

  restart(done) {
    done()
  }

  interrupt(done) {
    done()
  }

  onLive(lid, handler) {
  }

  sendLive(lid) {
  }

  handleVariant(content, variant, done) {
    variant = variant || 'default'
    if (this.variants[variant] === undefined) {
      return done(new VariantError(
        `Variant ${variant} not configured`,
        `Configure it by clicking the ${this.serverId} status indicator`
      ))
    }
    if (this.variants[variant] instanceof Error) {
      return done(new VariantError(
        `Variant ${variant} is misconfigured`,
        `Error: ${this.variants[variant].message};\nConfigure it by clicking the ${this.serverId} status indicator`,
        this.variants[variant].stack
      ))
    }
    if (variant === 'default') return done(null, content)
    const vObj = this.variants[variant]
    if (vObj instanceof Error) {
      return done(new Error('Variant failed to initialize: ' + vObj.message))
    }
    if (vObj.ename && vObj.evalue) {
      return done(new VariantError(
        `Variant ${variant} failed to initialize`,
        vObj.evalue,
        `Variant ${variant} failed to initialize\n` + vObj.traceback))
    }
    if (!vObj.asyncPreprocess) {
      let processed = ''
      try {
        processed = vObj.preprocess(content, this.config.variants[variant])
      } catch (err) {
        return done(VariantError.fromError(err))
      }
      return done(null, processed)
    }

    function onProcessed(err, processed) {
      if (err) {
        return done(new VariantError(`Error preprocessing for variant ${variant}`, err.message))
      }
      done(null, processed)
    }

    if (vObj.config) {
      vObj.preprocess(content, this.config.variants[variant], onProcessed)
    } else {
      vObj.preprocess(content, onProcessed)
    }
  }

  sendShell(content, variant, callbacks) {
    this.handleVariant(content, variant, (err, processed) => {
      if (err instanceof VariantError) {
        return showError(
          err.name,
          err.text,
          err.traceback,
          callbacks
        )
      } else if (err) {
        return showError(
          `Unexpected error while processing variant ${variant}`,
          err.message,
          null,
          callbacks
        )
      }
      this.sendRawShell(processed, variatedCallbacks(this, this.variants[variant], callbacks))
    })
  }
}

function variatedCallbacks(kernel, variant, callbacks) {
  if (!variant || variant === true) return callbacks
  const ncb = {}
  for (let name in callbacks) {
    ncb[name] = callbacks[name]
  }
  if (variant.postprocess) {
    ncb.postprocess = variant.postprocess.bind(null, kernel)
  }
  if (variant.rawOutput) {
    ncb.rawOutput = variant.rawOutput.bind(null, kernel)
  }
  return ncb
}

class VariantError {
  constructor(name, text, traceback) {
    this.name = name
    this.text = text
    this.traceback = traceback
  }
  static fromError(err) {
    return new VariantError('Error', err.message, err.stack)
  }
}

function showError(name, message, traceback, callbacks) {
  callbacks.start()
  callbacks.output({
    type: 'error',
    name: name,
    message: message,
    traceback: traceback,
  })
  callbacks.end()
}

