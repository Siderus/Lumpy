import Settings from 'electron-settings'
import { addFilesFromFSPath, unpinObject, getObjectStat, getObjectDag } from '../../api'
import DetailsWindow from '../Details/window'
import formatElement from '../../util/format-element'

const electron = require('electron')
const { shell } = electron
const dialog = electron.dialog || electron.remote.dialog
const app = electron.app || electron.remote.app

/**
 * Returns `true` if the user wants to wrap all files under a single dir,
 * `false` otherwise
 *
 * @returns {boolean}
 */
function askWhetherToWrapAllFiles () {
  const buttons = ['No', 'Yes']
  const successMessageOption = {
    type: 'info',
    title: 'Before we do that...',
    message: 'Would you like to wrap all these files under the same directory?',
    cancelId: 0,
    defaultId: 1,
    buttons
  }

  const btnId = dialog.showMessageBox(app.mainWindow, successMessageOption)
  return btnId === 1
}

/**
 * This function will add the files from a list of their paths, and show
 * message when it was a success or a failure.
 *
 * ToDo: add loading messages/feedback
 */
export function addFilesPaths (paths) {
  // If no paths were selected it means the user canceled
  if (!paths) return

  let promises
  if (paths.length > 1 && askWhetherToWrapAllFiles()) {
    // If the user says yes to wrapping all files, simply pass the paths array
    promises = [addFilesFromFSPath(paths)]
  } else {
    // User wants to wrap each file (this method expects an array)
    promises = paths.map(path => addFilesFromFSPath([path]))
  }

  return Promise.all(promises)
    .then(results => {
      // Array of wrappers expected
      // If the user upload only one file (or wrapped everything), open the Property Window (Details)
      if (results.length === 1) {
        const wrapper = results[0]
        DetailsWindow.create(app, wrapper.hash)
        return Promise.resolve()
      } else {
        // the old fashion way: show an alert with the `Open in browser` button
        // but we must fetch the stats first (to show the size)
        const promises = results.map(wrapper => {
          return getObjectStat(wrapper.hash)
            .then(result => {
              wrapper.stat = result
              return getObjectDag(wrapper.hash)
            })
            .then(result => {
              wrapper.dag = result
              return Promise.resolve(wrapper)
            })
        })
        return Promise.all(promises)
      }
    })
    .then(results => {
      if (!results) return
      const buttons = ['Close', 'Open in the browser']
      const elementsDetails = results
        .map(formatElement)
        .join('\n')

      const successMessageOption = {
        type: 'info',
        title: 'Files added successfully',
        message: 'All the files selected were added successfully!',
        detail: `This includes: \n\n${elementsDetails}`,
        cancelId: 0,
        buttons
      }

      const btnId = dialog.showMessageBox(app.mainWindow, successMessageOption)

      if (btnId === 1) {
        openInBrowser(results.map(wrapper => wrapper.hash))
      }
    })
    .catch((err) => {
      const errorMessageOption = {
        type: 'error',
        title: 'Adding the file failed',
        message: `Error: ${err}`
      }

      dialog.showMessageBox(app.mainWindow, errorMessageOption)
    })
}

/**
 * This functuon will setup the document and body events to add a file on drag
 * and drop action.
 */
export function setupAddAppOnDrop () {
  document.ondragover = document.ondrop = (ev) => {
    ev.preventDefault()
  }

  document.body.ondrop = (ev) => {
    ev.preventDefault()
    if (ev.dataTransfer) {
      // ev.dataTransfer.files is not enumerable
      // let paths = ev.dataTransfer.files((file)=> file.path)
      const paths = []
      for (let index = 0; index < ev.dataTransfer.files.length; index++) {
        paths.push(ev.dataTransfer.files[index].path)
      }

      addFilesPaths(paths)
    }
  }
}

/**
 * Prompt the user if he is sure that we should remove a file
 * return a Promise
 */
export function proptAndRemoveObjects (elements) {
  const isOneFile = elements.length === 1

  const title = isOneFile ? 'Delete file' : 'Delete files'
  const message = `Are you sure you want to delete the selected ${isOneFile ? 'file?' : `${elements.length} files?`}`
  const elementsDetails = elements
    .map(formatElement)
    .join('\n')

  const opts = {
    title,
    message,
    detail: `This includes: \n\n${elementsDetails}\n\nOnce done, you can't restore the files.`,
    type: 'warning',
    buttons: ['Cancel', 'Ok'],
    cancelId: 0
  }

  const btnClicked = dialog.showMessageBox(app.mainWindow, opts)
  // Check the electron dialog documentation, cancel button is always 0
  if (btnClicked !== 0) {
    const promises = elements.map(el => unpinObject(el.hash))

    // ToDo: Handle failure
    return Promise.all(promises)
  }
  return Promise.resolve()
}

/**
 * Open hashes in a browser
 */
export function openInBrowser (hashes) {
  const gatewayURL = Settings.get('gatewayURL') || 'https://siderus.io'
  hashes.forEach(hash => {
    shell.openExternal(`${gatewayURL}/ipfs/${hash}`)
  })
  return Promise.resolve(hashes)
}
