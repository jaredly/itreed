
import plugin from './lib'
export default plugin

import {plugins, variants} from './registrar'
plugin.register = function (mod, variants) {
  plugins[mod.id] = mod
}

plugin.availablePlugins = plugins
plugin.availableVariants = variants

plugin.registerVariant = function (variant) {
  if (!variants[variant.server]) {
    variants[variant.server] = {}
  }
  if (!variants[variant.server][variant.kernel]) {
    variants[variant.server][variant.kernel] = {}
  }
  if (variants[variant.server][variant.kernel][variant.id]) {
    throw new Error(`duplicate registration of a variant: ${variant.server}.${variant.kernel}.${variant.id}`)
  }
  variants[variant.server][variant.kernel][variant.id] = variant
}

