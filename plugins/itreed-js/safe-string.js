
module.exports = function (res) {
  if ('undefined' === typeof res) return 'undefined'
  if ('number' === typeof res && isNaN(res)) return 'NaN'
  try {
    return JSON.stringify(res, null, 2) || res + ''
  } catch (e) { }
  try {
    return res + ''
  } catch (e) { }
  return '<cannot display object>'
}

