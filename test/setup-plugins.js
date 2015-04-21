import JS from '../plugins/itreed-js'
import JUP from '../plugins/itreed-jupyter'
import jsx from '../plugins/itreed-js/jsx'
import ajax from '../plugins/itreed-jupyter/ajax'

import clojureScript from '../plugins/itreed-js/variants/clojurescript'
import babel from '../plugins/itreed-js/variants/babel'
import hy from '../plugins/itreed-jupyter/variants/hy'

import itreed from '..'

/**
 * Registers plugins with itreed
 */
export default function setup() {

  itreed.register(JS)
  itreed.registerVariant(babel)
  itreed.registerVariant(clojureScript)

  itreed.register(JUP)
  itreed.registerVariant(hy)
}

