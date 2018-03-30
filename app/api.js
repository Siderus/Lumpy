import { remote } from 'electron'
import byteSize from 'byte-size'
import ipfsAPI from 'ipfs-api'
import { join } from 'path'
import { createWriteStream, mkdirSync } from 'fs'
import multiaddr from 'multiaddr'
import request from 'request-promise-native'
import pjson from '../package.json'
import gateways from './gateways.json'

import Settings from 'electron-settings'
import { getMultiAddrIPFSDaemon } from './daemon'

export const ERROR_IPFS_UNAVAILABLE = 'IPFS NOT AVAILABLE'
export const ERROR_IPFS_TIMEOUT = 'TIMEOUT'
let IPFS_CLIENT = null

const USER_AGENT = `Orion/${pjson.version}`

export function setClientInstance (client) {
  IPFS_CLIENT = client
}

export function initIPFSClient () {
  if (IPFS_CLIENT !== null) return Promise.resolve(IPFS_CLIENT)

  // get IPFS client from the main process
  if (remote) {
    const globalClient = remote.getGlobal('IPFS_CLIENT')
    if (globalClient) {
      setClientInstance(globalClient)
      return Promise.resolve(IPFS_CLIENT)
    }
  }

  const apiMultiaddr = getMultiAddrIPFSDaemon()
  setClientInstance(ipfsAPI(apiMultiaddr))
  return Promise.resolve(IPFS_CLIENT)
}

/**
 * This function will allow the user to add a file to the IPFS repo.
 */
export function addFileFromFSPath (filePath, _queryGateways = queryGateways) {
  if (!IPFS_CLIENT) return Promise.reject(ERROR_IPFS_UNAVAILABLE)

  const options = { recursive: true }
  /**
   * Add the file/directory from fs
   */
  return IPFS_CLIENT.util.addFromFs(filePath, options)
    .then(files => {
      /**
       * If it was a directory it will be last
       * Example result:
       * [{
       *   hash: "QmRgutAxd8t7oGkSm4wmeuByG6M51wcTso6cubDdQtuEfL"
       *   path: "ipfs-test-dir/wrappedtext.txt"
       *   size: 15
       * }, {
       *   hash: "QmcysLdK6jV4QAgcdxVZFzTt8TieH4bkyW6kniPKTr2RXp"
       *   path: "ipfs-test-dir"
       *   size: 9425451
       * }]
       *
       */
      const rootFile = files[files.length - 1]
      const wrapperDag = {
        Data: Buffer.from('\u0008\u0001'),
        Links: [{
          Name: rootFile.path,
          Hash: rootFile.hash,
          Size: rootFile.size
        }]
      }

      return IPFS_CLIENT.object.put(wrapperDag)
        .then(res => {
          // res is of type DAGNode
          // https://github.com/ipld/js-ipld-dag-pb#nodetojson
          res = res.toJSON()
          const wrapper = {
            hash: res.multihash,
            path: '',
            size: res.size
          }
          files.push(wrapper)

          return Promise.all([
            /**
             * Pin the wrapper directory
            */
            IPFS_CLIENT.pin.add(wrapper.hash),
            /**
             * Unpin the initial upload
             */
            IPFS_CLIENT.pin.rm(rootFile.hash)
          ])
            /**
             * Return all items + the wrapper dir
             */
            .then(() => {
              if (!Settings.getSync('skipGatewayQuery')) {
                files.forEach(file => _queryGateways(file.hash))
              }
              return Promise.resolve(files)
            })
        })
    })
}

/**
 * Query the gateways to help content propagation and
 * ensure that the file is available in the network.
 */
export function queryGateways (hash) {
  gateways.forEach(gateway => {
    request({
      uri: `${gateway}/${hash}`,
      headers: { 'User-Agent': USER_AGENT }
    })
      .catch(err => console.error(`Could not query ${gateway}. Error: ${err}`))
  })
}

/**
 * This function will allow the user to unpin an object from the IPFS repo.
 * Used to remove the file from the repo, if combined with the GC.
 */
export function unpinObject (hash) {
  if (!IPFS_CLIENT) return Promise.reject(ERROR_IPFS_UNAVAILABLE)
  const options = { recursive: true }
  return IPFS_CLIENT.pin.rm(hash, options)
}

/**
 * This function will allow the user to pin an object to the IPFS repo.
 * Used to prevent the Garbage collector from removing it.
 */
export function pinObject (hash) {
  if (!IPFS_CLIENT) return Promise.reject(ERROR_IPFS_UNAVAILABLE)

  return IPFS_CLIENT.pin.add(hash)
}

/**
 * Provide a promise to get the Repository information. Its RepoSize is actually
 * a byteSize (ex: {value, unit}) to make it human readable
 */
export function getRepoInfo () {
  if (!IPFS_CLIENT) return Promise.reject(ERROR_IPFS_UNAVAILABLE)

  return IPFS_CLIENT.repo.stat({ human: false })
    .then((stats) => {
      // Providing {value, unit} to the stats.RepoSize
      stats.RepoSize = byteSize(stats.RepoSize)
      return Promise.resolve(stats)
    })
}

/**
 * Provides a Promise that will resolve the peers list (in the future that can
 * be manipualted)
 */
export function getPeersInfo () {
  if (!IPFS_CLIENT) return Promise.reject(ERROR_IPFS_UNAVAILABLE)

  return IPFS_CLIENT.swarm.peers()
}

/**
 * Provides a Promise that will resolve the peer info (id, pubkye etc..)
 */
export function getPeer () {
  if (!IPFS_CLIENT) return Promise.reject(ERROR_IPFS_UNAVAILABLE)

  return IPFS_CLIENT.id()
}

/**
 * Provide a Promise that will resolve into the Pin's object, with an hash key
 * containing its hash.
 */
export function getObjectList () {
  if (!IPFS_CLIENT) return Promise.reject(ERROR_IPFS_UNAVAILABLE)

  return IPFS_CLIENT.pin.ls()
}

/**
 * Provides a Promise that will resolve with true if the hash is pinned
 * or resolve with false otherwise
 */
export function isObjectPinned (hash) {
  if (!IPFS_CLIENT) return Promise.reject(ERROR_IPFS_UNAVAILABLE)

  return IPFS_CLIENT.pin.ls()
    .then(pins => {
      // find returns the object, we need to cast it to boolean
      return Promise.resolve(!!pins.find(pin => pin.hash === hash))
    })
}

/**
 * Provides using a Promise the stat of an IPFS object. Note: All the Size
 * values are a byteSize object (ex: {value, unit}) to make it human readable
 */
export function getObjectStat (objectMultiHash) {
  return new Promise((resolve, reject) => {
    if (!IPFS_CLIENT) return reject(ERROR_IPFS_UNAVAILABLE)

    return IPFS_CLIENT.object.stat(objectMultiHash)
      .then((stat) => {
        stat.BlockSize = byteSize(stat.BlockSize)
        stat.LinksSize = byteSize(stat.LinksSize)
        stat.DataSize = byteSize(stat.DataSize)
        stat.CumulativeSize = byteSize(stat.CumulativeSize)
        return resolve(stat)
      })
      .catch(reject)
  })
}

/**
 * Provides using a Promise the serialized dag of an IPFS object.
 */
export function getObjectDag (objectMultiHash) {
  return new Promise((resolve, reject) => {
    if (!IPFS_CLIENT) return reject(ERROR_IPFS_UNAVAILABLE)

    return IPFS_CLIENT.object.get(objectMultiHash)
      .then((dag) => {
        dag = dag.toJSON()
        dag.size = byteSize(dag.size)
        dag.links = dag.links.map(link => {
          link.size = byteSize(link.size)
          return link
        })

        return resolve(dag)
      })
      .catch(reject)
  })
}

/**
 * isDagDirectory will return a boolean value based on the content of the dag:
 * If it contains a IPFS "directory" structure, then returns true
 */
export function isDagDirectory (dag) {
  return dag.data.length === 2 && dag.data.toString() === '\u0008\u0001'
}

/**
 * Returns a Promise that resolves a fully featured StorageList with more
 * details, ex: Sizes, Links, Hash, Data. Used by the Interface to render the table
 */
export function getStorageList (pins) {
  return new Promise((resolve, reject) => {
    // Filter out the indirect objects. Required to reduce API Calls
    pins = pins.filter(pin => pin.type !== 'indirect')

    // Get a list of promises that will return the pin object with the
    // stat and dag injected
    const promises = pins.map(pin => {
      // Use the promises to perform multiple injections, so always
      // resolve with the pin object
      return getObjectStat(pin.hash)
        .then(stat => {
          pin.stat = pin.stat || stat

          return getObjectDag(pin.hash)
        })
        .then(dag => {
          pin.dag = dag
          pin.isDirectory = isDagDirectory(dag)

          return Promise.resolve(pin)
        })
    })

    // Return a promise that will complete when all the data will be
    // available. When done, it will run the main promise success()
    return Promise.all(promises).then(resolve, reject)
  })
}

/**
 * This function will return a promise that wants to provide the peers that
 * are owning a specific hash.
 */
export function getPeersWithObjectbyHash (hash) {
  if (!IPFS_CLIENT) return Promise.reject(ERROR_IPFS_UNAVAILABLE)
  return IPFS_CLIENT.dht.findprovs(hash)
}

/**
 * importObjectByHash will "import" an object recursively, by pinning it to the
 * repository.
 */
export function importObjectByHash (hash) {
  if (!IPFS_CLIENT) return Promise.reject(ERROR_IPFS_UNAVAILABLE)
  const options = { recursive: true }
  return IPFS_CLIENT.pin.add(hash, options)
}

/**
 * This function allows to save on FS the content of an object to a specific
 * path.
 *
 * See: https://github.com/ipfs/interface-ipfs-core/tree/master/API/files#get
 */
export function saveFileToPath (hash, dest) {
  return new Promise((resolve, reject) => {
    if (!IPFS_CLIENT) return reject(ERROR_IPFS_UNAVAILABLE)

    const stream = IPFS_CLIENT.files.getReadableStream(hash)

    stream.on('data', (file) => {
      const finalDest = join(dest, file.path)

      // First make all the directories
      if (!file.content) {
        mkdirSync(finalDest)
      } else {
        // Pipe the file content into an actual write stream
        const writeStream = createWriteStream(finalDest)
        file.content.pipe(writeStream)
      }
    })

    stream.on('end', resolve)
    stream.on('error', reject)
  })
}

/**
 * This will just run the garbage collector to clean the repo for unused and
 * Unpinned objects.
 */
export function runGarbageCollector () {
  if (!IPFS_CLIENT) return Promise.reject(ERROR_IPFS_UNAVAILABLE)
  return IPFS_CLIENT.repo.gc()
}

/**
 * Resolves an IPNS name to an IPFS hash.
 */
export function resolveName (name) {
  if (!IPFS_CLIENT) return Promise.reject(ERROR_IPFS_UNAVAILABLE)

  return IPFS_CLIENT.name.resolve(name)
}

/**
 * connectTo allows easily to connect to a node by specifying a str multiaddress
 * example: connectTo("/ip4/192.168.0.22/tcp/4001/ipfs/Qm...")
 */
export function connectTo (strMultiddr) {
  if (!IPFS_CLIENT) return Promise.reject(ERROR_IPFS_UNAVAILABLE)
  const addr = multiaddr(strMultiddr)
  return IPFS_CLIENT.swarm.connect(addr)
}

/**
 * promiseIPFSReady is a function that will waint and resolve the promise
 * only when the IPFS is accepting IPFS API. Reject after timeout in sec
 */
export function promiseIPFSReady (timeout, ipfsApiInstance) {
  timeout = timeout || 30 // defaults 30 secs
  ipfsApiInstance = ipfsApiInstance || IPFS_CLIENT // allows custom api
  let iID // interval id
  let trial = 0

  return new Promise((resolve, reject) => {
    iID = setInterval(() => {
      trial++
      if (trial >= timeout) {
        clearInterval(iID)
        return reject(ERROR_IPFS_TIMEOUT)
      }

      return getPeer().then(() => {
        clearInterval(iID)
        return resolve()
      }).catch(() => { }) // do nothing in case of errors
    }, 1000) // every second
  })
}
