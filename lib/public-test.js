var dWebFlock = require('drevelation')
var dWebChannel = require('dweb-channel')
var dWebFlockPolicy = require('dweb-flock-policy')()
var deThunk = require('dethunk')
var debug = require('debug')('drsatoshi')

module.exports = runPublicPeerTest

function runPublicPeerTest (state, bus, opts, cb) {
  var address = opts.address
  var port = opts.port || 6621

  var connected = false
  var dataEcho = false

  var sw = dWebFlock({
    dns: {
      servers: dWebFlockPolicy.dns.server
    },
    whitelist: [address],
    dht: false,
    hash: false,
    utp: opts.utp,
    tcp: opts.tcp
  })

  sw.on('error', function () {
    if (port === 6621) bus.emit('error', `Default DWEB port did not work (${port}), using random port`)
    else bus.emit('error', `Specified port did not work (${port}), using random port`)
    sw.listen(0)
  })
  sw.listen(port)

  sw.on('listening', function () {
    state.title = 'Looking for Dr. Satoshi on the dWeb network...'
    sw.join('satoshi-public-peer', {announce: false})
    sw.on('connecting', function (peer) {
      state.title = `Connecting to Dr. Satoshi Over dweb://..., ${peer.host}:${peer.port}`
      debug('Trying to connect to Dr. Satoshi over dweb://, %s:%d', peer.host, peer.port)
    })
    sw.on('peer', function (peer) {
      state.title = `Revelated Dr. Satoshi, ${peer.host}:${peer.port}`
      debug('Revelated Dr. Satoshi, %s:%d', peer.host, peer.port)
    })
    sw.on('connection', function (connection) {
      connected = true
      state.title = `I found Dr. Satoshi`
      debug('Connection established to Dr. Satoshi')
      connection.setEncoding('utf-8')
      connection.on('data', function (remote) {
        dataEcho = true
        state.title = `Successful data transfer with Dr. Satoshi via ${opts.tcp ? 'TCP' : 'UDP'}`
        destroy(cb)
      })
      dWebChannel(connection, connection, function () {
        debug('dWeb Connection closed')
        destroy(cb)
      })
    })
    // debug('Attempting connection to Dr. Satoshi, %s', satoshi)
    setTimeout(function () {
      if (connected) return
      bus.emit('error', 'dWeb Connection timed out.')
      destroy(cb)
    }, 10000)
    var destroy = deThunk(function (done) {
      sw.destroy(function () {
        if (connected && dataEcho) return done()
        state.title = `Public dWeb Peer Test via ${opts.tcp ? 'TCP' : 'UDP'} Failed`
        if (!connected) {
          done('Unable to connect to a public dWeb server')
        }
        if (!dataEcho) {
          done('Data was not echoed back from public server')
        }
        done()
      })
    })
  })
}
