var exec = require('child_process').exec
var crypto = require('crypto')
var os = require('os')
var dPackLogger = require('dpack-logger')
var dPackCliOutput = require('dpack-logger/output')
var dPackJobs = require('dpack-jobs')
var chalk = require('chalk')
var Menu = require('menu-string')
var debug = require('debug')('drsatoshi')
var SatoshiJobs = require('./lib/satoshi-jobs')
var satoshiPeerJobs = require('./lib/satoshi-peer-job')
var peerTest = require('./lib/satoshi-inspect-peer')

var NODE_VER = process.version
var DRSATOSHI_RELEASE = require('./package.json').version
var DPACK_HANDLE = process.title === 'dpack'

module.exports = function (opts) {
  if (!opts) opts = {}
  opts.peerId = opts.peerId || null
  opts.port = typeof opts.port === 'number' ? opts.port : 3282

  var views = [headerOutput, versionsOutput, menuView]
  var dPackEntry = dPackLogger(views)
  dPackEntry.use(retrieveReleases)

  if (opts.peerId) return runP2P() // run p2p tests right away

  var menu = Menu([
    'dPrimer - Check if dPack Is Installed Correctly and The Status Of The dWeb Network.',
    'dWeb P2P Check - Check and Verify the Connection Between Two dWeb Peers.'
  ])
  dPackEntry.use(function (state) {
    state.opts = opts
    state.port = opts.port
  })
  dPackEntry.use(function (state, bus) {
    bus.emit('render')

    dPackEntry.input.on('down', function () {
      menu.down()
      bus.render()
    })
    dPackEntry.input.on('up', function () {
      menu.up()
      bus.render()
    })
    dPackEntry.input.once('enter', function () {
      state.selected = menu.selected()
      bus.render()
      initChecks(state.selected)
    })
  })

  function initChecks (selected) {
    if (selected.index === 0) return initPrimer()
    else runP2P()
  }

  function initPrimer () {
    var runTasks = dPackJobs(SatoshiJobs(opts))
    views.push(runTasks.view)
    dPackEntry.use(runTasks.use)
    dPackEntry.use(function (state, bus) {
      bus.once('done', function () {
        var testCountMsg = dPackCliOutput(`
          ${chalk.bold(state.pass)} of ${chalk.bold(state.totalCount)} tests passed
        `)
        console.log('\n')
        if (state.fail === 0) {
          console.log(dPackCliOutput(`
            ${chalk.bold.greenBright('SUCCESS!')}
            ${testCountMsg}
            Use Peer-to-Peer tests to check direct connections between two computers.
          `))
          process.exit(0)
        }
        console.log(dPackCliOutput(`
          ${chalk.bold.redBright('FAIL')}
          ${testCountMsg}

          Your network may be preventing you from using dPack.
          For further troubleshooting, visit https://dpack.io/guide/issues
        `))
        process.exit(1)
      })
    })
  }

  function runP2P () {
    if (opts.peerId) {
      opts.existingTest = true
      opts.id = opts.peerId
      return startTasks()
    }

    opts.existingTest = false
    opts.id = crypto.randomBytes(32).toString('hex')
    startTasks()

    function startTasks () {
      var runTasks = dPackJobs(satoshiPeerJobs(opts))
      views.push(runTasks.view)
      dPackEntry.use(runTasks.use)
      dPackEntry.use(function (state, bus) {
        // initial tasks done
        bus.once('done', function () {
          // TODO: Fix, overwriting previous line
          views.push(function () { return '\n' })
          bus.render()

          state.id = opts.id
          state.existingTest = opts.existingTest
          peerTest(state, bus, views)
        })
      })
    }
  }

  function headerOutput (state) {
    return `Welcome to the office of ${chalk.greenBright('Dr. Satoshi')}!\n`
  }

  function menuView (state) {
    if (!menu) return ''
    if (state.selected && state.selected.index === 0) return `Running ${state.selected.text}\n`
    else if (state.selected) {
      return dPackCliOutput(`
        To start a new dWeb Peer-to-Peer test, press ENTER.
        Otherwise enter test ID.

        >
      `)
    }
    return dPackCliOutput(`
      Which tests would you like to run?
      ${menu.toString()}
    `)
  }

  function versionsOutput (state) {
    if (!state.versions) return ''
    var version = state.versions
    return dPackCliOutput(`
      Software Info:
        ${os.platform()} ${os.arch()}
        Node ${version.node}
        Dr Satoshi v${version.drSatoshi}
        ${dpackRelease()}
    `) + '\n'

    function dpackRelease () {
      if (!DPACK_HANDLE || !version.dpack) return ''
      return chalk.green(`dpack v${version.dpack}`)
    }
  }

  function retrieveReleases (state, bus) {
    state.versions = {
      dpack: null,
      drSatoshi: DRSATOSHI_RELEASE,
      node: NODE_VER
    }
    exec('dpack -v', function (err, stdin, stderr) {
      if (err && err.code === 127) {
        // dPack not installed/executable
        state.dPackInstalled = false
        return bus.emit('render')
      }
      // if (err) return bus.emit('render')
      // TODO: right now dpack -v exits with error code, need to fix
      state.versions.dpack = stderr.toString().split('\n')[0].trim()
      bus.emit('render')
    })
  }
}
