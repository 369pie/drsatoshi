var dns = require('dns')
var chalk = require('chalk')
var debug = require('debug')('drsatoshi')
var runPublicTest = require('./public-test')
var identityTest = require('./identity-test')

module.exports = function (opts) {
  if (!opts) opts = {}

  var SATOSHI_URL = 'satoshi.dwebs.io'
  var satoshiAddress = null
  var port = opts.port

  var satoshiJobs = [
    {
      title: 'Your dWeb Identity',
      task: function (state, bus, done) {
        state.port = port
        bus.on('error', function (err) {
          if (!state.output) state.output = '  ' + chalk.dim(err)
          else state.output += '\n  ' + chalk.dim(err)
        })
        identityTest(state, bus, done)
      }
    },
    {
      title: 'Inspecting dPack Native Plugin Installations',
      task: nativeModuleTask
    },
    {
      title: 'Pinging Dr. Satoshi Over dweb://',
      task: dnsLookupTask
    },
    {
      title: 'Inspecting dWeb and dPack Public Connections via TCP',
      task: function (state, bus, done) {
        publicPeerTask(state, bus, {tcp: true, utp: false}, done)
      },
      skip: function (done) {
        if (satoshiAddress) return done()
        done(`Skipping... unable to reach ${SATOSHI_URL}`)
      }
    },
    {
      title: 'Inspecting dWeb and dPack Public Connections via UTP',
      task: function (state, bus, done) {
        publicPeerTask(state, bus, {tcp: false, utp: true}, done)
      },
      skip: function (done) {
        if (satoshiAddress) return done()
        done(`Skipping... unable to reach ${SATOSHI_URL}`)
      }
    }
  ]

  return satoshiJobs

  function dnsLookupTask (state, bus, done) {
    dns.lookup(SATOSHI_URL, function (err, address, _) {
      if (err) {
        state.title = 'Unable to reach the Dr. Satoshi server'
        return done(`Please check if you can resolve the url manually, ${chalk.reset.cyanBright(`ping ${SATOSHI_URL}`)}`)
      }
      state.title = 'Successfully Resolved Dr. Satoshi Server'
      satoshiAddress = address
      done()
    })
  }

  function nativeModuleTask (state, bus, done) {
    try {
      require('utp-native')
      state.title = 'Loaded native modules'
    } catch (err) {
      state.title = 'Error loading native modules'
      // TODO: link to FAQ/More Help
      return done(`Unable to load utp-native.\n  This will make it harder to connect peer-to-peer.`)
    }
    done()
  }

  function publicPeerTask (state, bus, opts, done) {
    opts = Object.assign({port: port, address: satoshiAddress}, opts)
    state.errors = []
    state.messages = []

    bus.on('error', (err) => {
      // TODO: persist these after task is done?
      debug('ERROR - ', err)
    })

    runPublicTest(state, bus, opts, function (err) {
      if (err) return done(err)
      done()
    })
  }
}
