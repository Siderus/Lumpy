/* eslint no-console:0 */

import { spawn, execSync } from 'child_process'

import Settings from 'electron-settings'

/**
 * getPathIPFSBinary will return the IPFS default path
 */
export function getPathIPFSBinary() {
  return Settings.getSync('daemon.pathIPFSBinary') || '/usr/local/bin/ipfs'
}

/**
 * startIPFSCommand will start IPFS go daemon, if installed.
 * return child process with IPFS daemon
 */
export function startIPFSCommand() {
  if (Settings.getSync('daemon.startIPFSAtStartup') === false) return null

  const binaryPath = getPathIPFSBinary()
  const ipfsProcess = spawn(binaryPath, ['daemon'])

  ipfsProcess.stdout.on('data', (data) => console.log(`IPFS: ${data}`))
  ipfsProcess.stderr.on('data', (data) => console.log(`IPFS Error: ${data}`))
  ipfsProcess.on('close', (exit) => console.log(`IPFS Closed: ${exit}`))

  return ipfsProcess
}

/**
 * Returns the multiAddr usable to connect to the local dameon via API
 */
export function getMultiAddrIPFSDaemon() {
  const binaryPath = getPathIPFSBinary()
  const multiAddr = execSync(`${binaryPath} config Addresses.API`)
  return `${multiAddr}`
}

/**
 * Set the multiAddr usable to connect to the local dameon via API.
 * It restores it to /ip4/127.0.0.1/tcp/5001
 */
export function setMultiAddrIPFSDaemon() {
  const binaryPath = getPathIPFSBinary()
  const multiAddr = execSync(`${binaryPath} config Addresses.API /ip4/127.0.0.1/tcp/5001`)
  return `${multiAddr}`
}
