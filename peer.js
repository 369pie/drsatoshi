#!/usr/bin/env node

// this is the peer at 'satoshi.dwebs.io'

var dWebFlock = require('drevelation')
var crypto = require('crypto')
var dWebChannel = require('dweb-channel')
var dWebFlockPolicy = require('dweb-flock-policy')()

var sw = dWebFlock({
  dns: {
    servers: dWebFlockPolicy.dns.server
  },
  hash: false,
  dht: false
})

sw.on('error', function () {
  sw.listen(0)
})
sw.listen(8887)
sw.on('listening', function () {
  sw.join('satoshi-public-peer')
  sw.on('connecting', function (peer) {
    console.log('Trying to connect to %s:%d over dweb://', peer.host, peer.port)
  })
  sw.on('peer', function (peer) {
    console.log('Revelated %s:%d', peer.host, peer.port)
  })
  sw.on('connection', function (connection) {
    var data = crypto.randomBytes(16).toString('hex')
    console.log('Connection established to remote dWeb peer')
    connection.setEncoding('utf-8')
    connection.write(data)
    connection.on('data', function (remote) {
      console.log('Got data back from dWeb peer %s', remote.toString())
      connection.destroy()
    })
    dWebChannel(connection, connection, function () {
      console.log('dWeb Connection closed')
    })
  })
  console.log('Waiting for incoming connections over dweb://... (local port: %d)', sw.address().port)
})
