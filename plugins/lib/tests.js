
import expect from 'expect.js'

export default function pluginTests({Server, Kernel, serverConfig, kernelConfig, testSpec, completes, evals}) {

  describe('Server', () => {

    it('should get the kernel specs', done => {
      const s = new Server(serverConfig)
      s.init((err, spec) => {
        expect(err).to.not.be.ok()
        testSpec(spec)
        done()
      })
    })

  })

  describe('Kernel', () => {
    it('should get up and running, and then shut down', done => {
      const s = new Server(serverConfig)
      const DOCID = 'test-itreed-jupyter'
      s.init((err, spec) => {
        expect(err).to.not.be.ok()
        testSpec(spec)
        const k = new Kernel(s, kernelConfig, DOCID)
        k.init(err => {
          expect(err).to.not.be.ok()
          k.shutdown(err => {
            expect(err).to.not.be.ok()
            done()
          })
        })
      })
    })

    describe('with a running kernel', () => {
      let k, s
      let DOCID = 'other-test'
      before(done => {
        s = new Server(serverConfig)
        s.init((err, spec) => {
          expect(err).to.not.be.ok()
          testSpec(spec)
          k = new Kernel(s, kernelConfig, DOCID)
          k.init(err => {
            expect(err).to.not.be.ok()
            done()
          })
        })
      })

      after(done => {
        k.shutdown(done)
      })

      completes.forEach(compl => {
        it('should work complete ' + JSON.stringify(compl.code), done => {
          k.complete(compl.code, compl.pos, data => {
            expect(data).to.eql(compl.res)
            done()
          })
        })
      })

      evals.forEach(ev => {
        it(`should eval ${JSON.stringify(ev.code)}`, done => {
          const evts = []
          k.sendShell(ev.code, null, {
            start() {
              evts.push('start')
            },
            output(data) {
              evts.push(data)
            },
            end() {
              expect(evts).to.eql(['start'].concat(ev.outputs))
              done()
            },
          })
        })
      })

    })

  })
}



