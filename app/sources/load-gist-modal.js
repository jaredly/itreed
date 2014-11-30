/* @flow */

var showModal = require('./show-modal')

type Cb = (err: any, result?: any) => void;

module.exports = function (tryImport: (id: string, done: (err: any, result?: any) => void) => void, done: Cb) {
  showModal('Import a Gist', function (state, set, done) {
    if (state.loading) {
      return <div>Loading...</div>
    }

    var importit = () => {
      set({loading: true})
      tryImport(state.gist_id, (err, result) => {
        if (err) return set({loading: false, error: true})
        this.props.onClose(null, result, state.gist_id)
      })
    }

    return <div>
      {state.error && 'Error loading gist...'}
      Enter the username and gist id to import:
      <input placeholder='username/gistid'
        value={state.gist_id}
        onChange={set('gist_id', true)}/>
      <button onClick={importit}>Import</button>
    </div>
  }, done)
}

