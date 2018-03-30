import { spawn } from 'child_process'
import exec from 'promised-exec'
import request from 'request-promise-native'
import Settings from 'electron-settings'
import pjson from '../package.json'

/**
 * getPathIPFSBinary will return the IPFS default path
 */
export function getPathIPFSBinary () {
  // on macOS the default should be /usr/local/bin/ipfs
  // on windows and linux the binary is assumed to be in the PATH
  const defaultPath = process.platform === 'darwin' ? '/usr/local/bin/ipfs' : 'ipfs'
  return Settings.getSync('daemon.pathIPFSBinary') || defaultPath
}

/**
 * startIPFSDaemon will start IPFS go daemon, if installed.
 * return a promise with child process of IPFS daemon
 */
export function startIPFSDaemon () {
  // TODO: the default of this is undefined, therefore the default is to start the daemon
  if (Settings.getSync('daemon.startIPFSAtStartup') === false) { return Promise.resolve() }

  return new Promise((resolve, reject) => {
    const binaryPath = getPathIPFSBinary()
    // TODO: this promise should reject on error
    // https://nodejs.org/docs/latest/api/child_process.html#child_process_event_error
    const ipfsProcess = spawn(binaryPath, ['daemon'])

    ipfsProcess.stdout.on('data', (data) => console.log(`IPFS: ${data}`))
    ipfsProcess.stderr.on('data', (data) => console.log(`IPFS Error: ${data}`))
    ipfsProcess.on('close', (exit) => console.log(`IPFS Closed: ${exit}`))

    return resolve(ipfsProcess)
  })
}

/**
 * Returns the multiAddr usable to connect to the local dameon via API
 */
export function getMultiAddrIPFSDaemon () {
  // If the user specified a value in the multiaddrAPI
  const settingsAddress = Settings.getSync('daemon.multiAddrAPI')
  if (settingsAddress) return settingsAddress

  // Otherwise ask the binary wich one to use
  // const binaryPath = getPathIPFSBinary()
  // const multiAddr = execSync(`${binaryPath} config Addresses.API`)
  return '/ip4/127.0.0.1/tcp/5001'
}

/**
 * Set the multiAddr usable to connect to the local dameon via API.
 * It restores it to /ip4/127.0.0.1/tcp/5001
 * returns a promise.
 */
export function setMultiAddrIPFSDaemon () {
  const binaryPath = getPathIPFSBinary()
  return exec(`${binaryPath} config Addresses.API /ip4/127.0.0.1/tcp/5001`)
}

/**
 * connectToCMD allows easily to connect to a node by specifying a str
 * multiaddress. example: connectToCMD("/ip4/192.168.0.22/tcp/4001/ipfs/Qm...")
 * returns a promise
 */
export function connectToCMD (strMultiddr) {
  const binaryPath = getPathIPFSBinary()
  return exec(`${binaryPath} swarm connect ${strMultiddr}`)
}

/**
 * addBootstrapAddr allows easily to add a node multiaddr as a bootstrap nodes
 * example: addBootstrapAddr("/ip4/192.168.0.22/tcp/4001/ipfs/Qm...")
 * returns a promise
 */
export function addBootstrapAddr (strMultiddr) {
  const binaryPath = getPathIPFSBinary()
  return exec(`${binaryPath} bootstrap add ${strMultiddr}`)
}

/**
 * getSiderusPeers returns a Promise that will download and return a list of
 * multiaddress (as str) of IPFS nodes from Siderus Network.
 */
export function getSiderusPeers () {
  return request({
    uri: 'https://meta.siderus.io/ipfs/peers.txt',
    headers: { 'User-Agent': `Orion/${pjson.version}` }
  }).then(res => {
    let peers
    // split the file by endlines
    peers = res.split(/\r?\n/)
    // remove empty lines
    peers = peers.filter(el => el.length > 0)
    return Promise.resolve(peers)
  })
}
