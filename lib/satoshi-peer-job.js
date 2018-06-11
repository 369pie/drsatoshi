var dns = require('dns')
var chalk = require('chalk')
var debug = require('debug')('drsatoshi')
var identityTest = require('./identity-test')

module.exports = function (opts) {
  if (!opts) opts = {}

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
    }
  ]

  return satoshiJobs

  function nativeModuleTask (state, bus, done) {
    try {
      require('utp-native')
      state.title = 'Loaded dPack Native Plugins'
    } catch (err) {
      state.title = 'Error Loading dPack Native Plugins'
      // TODO: link to FAQ/More Help
      return done(`Unable To Load udp-native.\n  This will make it harder to connect peer-to-peer over dweb:// or via UDP.`)
    }
    done()
  }
}
