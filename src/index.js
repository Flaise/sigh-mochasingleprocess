import { Bacon, log } from 'sigh-core'
import {default as Promise} from 'bluebird'
import {clone} from 'lodash'
import Mocha from 'mocha'
var glob = Promise.promisify(require('glob'))

export default function(op, opts = {}) {
  return op.stream.flatMapLatest(events => {
    var { files } = opts
    var initRequireCache = clone(require.cache)
    delete opts.files

    var mochaPromise = glob(files).then(fileList => {
      Object.keys(require.cache).forEach(key => {
        if (! initRequireCache[key])
          delete require.cache[key]
      })
      var mocha = new Mocha(clone(opts))
        
      fileList.forEach(file => mocha.addFile(file))

      return new Promise(resolve => {
        mocha.run(nFailures => resolve(nFailures))
      })
    })
    .then(nFailures => {
      return nFailures
    })

    return Bacon.fromPromise(mochaPromise.then(nFailures => {
      return nFailures > 0 ? new Bacon.Error(`mocha: ${nFailures} tests failed`) : events
    }))
  })
}
