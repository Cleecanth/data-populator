/**
 * Utils
 *
 * Provides utility and miscellaneous functionality.
 */

import { log } from '../../core'
import xd from './xd';
import * as Data from './data';
const { Group, SymbolInstance } = xd('scenegraph')

/**
 * Checks if url is valid.
 *
 * @param {String} url
 * @param {Boolean}
 */
export function isValidURL (url, http) {
  if (http) {
    if (/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g.test(url)) {
      return true
    } else {
      return false
    }
  } else {
    if (/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/g.test(url)) {
      return true
    } else {
      return false
    }
  }
}

/**
 * Capitalize first letter of string.
 *
 * @param {String} string
 * @param {String}
 */
export function capitalizeFirstLetter (string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

/**
 * Access object by string.
 *
 * @param {Object} object
 * @param {String} string
 * @param {Object}
 */
export function accessObjectByString (object, string) {
  let newObject = JSON.parse(JSON.stringify(object))
  if (string && string.length) {
    string = string.replace(/\[(\w+)\]/g, '.$1') // convert indices to properties e.g [0] => .0
    string = string.replace(/^\./, '') // strip leading dot

    let splitString = string.split('.')
    for (let i = 0; i < splitString.length; i++) {
      let key = splitString[i]
      newObject = newObject[key]
    }
  }

  return newObject
}

/**
 * Get the string accessor of the first array in object that contains objects.
 *
 * @param {Object} object
 * @param {String}
 */
export function getArrayStringAccessor (object) {
  // let array
  let strings = []
  findLongestArrayRecursive(object)

  function findLongestArrayRecursive (obj) {
    let newObject = JSON.parse(JSON.stringify(obj))
    let firstLine = JSON.stringify(newObject, null, 4).split('\n')[0].trim()

    if (firstLine === '{') {
      for (const [key, value] of Object.entries(newObject)) {
        if (value === Object(value)) {
          strings.push(key)
          findLongestArrayRecursive(value)
        }
      }
    } else if (firstLine === '[') {
      let objectsInArray = true
      for (let i = 0; i < newObject.length; i++) {
        if (JSON.stringify(newObject[i], null, 4).split('\n')[0].trim() !== '{') {
          objectsInArray = false
        }
      }

      if (!objectsInArray || newObject.length <= 1) {
        for (let i = 0; i < newObject.length; i++) {
          if (newObject[i] === Object(newObject[i])) {
            strings.push(i)
            findLongestArrayRecursive(newObject[i])
          }
        }
      }
    }
  }

  let string = ''
  for (let i = 0; i < strings.length; i++) {
    if (typeof strings[i] === 'number') {
      string += `[${strings[i]}]`
    } else if (typeof strings[i] === 'string') {
      if (i === 0) string += `${strings[i]}`
      if (i !== 0) string += `.${strings[i]}`
    }
  }

  // log(string)
  return string
}

/**
 * Checks if a node is a Group or SymbolInstance (Component)
 * @param {SceneNode} node - the node to check
 * @returns {Boolean}
 */
export function isGroupLike(node) {
  return (node instanceof Group || node instanceof SymbolInstance);
}

export function getRectanglePlaceholderBase64 (layer) {
  let largePlaceholderImageBase64 = 'data:image/png;base64,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'
  let mediumPlaceholderImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAFABAMAAAA/vriZAAAAD1BMVEUAAACsrKz///////////932ND6AAAABHRSTlNAgfz9s3VvAAAABApJREFUeF7t3d1JLEEQgNEyg0EjWJgEBCNYO/+YROblC+E8lHClf6pAzkVdZ7ur5rwG/vg8c97XsB8f95k7hCDg+//fBQO+nk8u4PV8hgEfRxkwhCBgBiZgRiRghiZgxyRgJyZgZyRgpyZg5yRgF0zArpCAXTIBu0YCdtEE7CoJ2GUTsOskYDdMwO6QgN0yAbtHAnbTBOwuCdhtE7D7JGADTMBGkIANMQEbQwI2yARsFAnYMBOwcSRgA03ARpKADTUBG0sCNtgEbDQJ2HATsPEkYBNMwGaQgE0xAZtDAjbJBGwWCdg0E7B5JGATTcBmkoBNNQGbSwI22QRsNgnYdBOw+SRgCU3AEpKAJTQBS0gCltAELCEJWEITsIQkYAlNwBKSgCU0AUtIApbQBCwhCVhCE7CEJGAJTcASkoAlNAFLSAKW0AQsIQlYQhOwhCRgCU3AEpKAJTQBS0gCltAELCEJWEITsIQkYAlNwBKSgCU0AUtIApbQBCwhCVhCE7CEJGAJTcASkoAlNAFLSAKW0AQsIQlYQhOwhCRgCU3AEpKAJTQBS0gCltAELCEJWEITsIQkYAlNwBKSgCU0AUtIApbQBCwhCVhCE7CEJGAJTcASkoAlNAFLSAKW0AQsIQlYQhOwhCRgCU3AEpKAJTQBS0gCltAELCEJWEIZsIQFJAkLKBIWkCQsoEhYQJKwgCJhAUnCApqEATQJA4gSBtAkDCBKGECTMIAk4e9PAElCGnDm65zv2S8Q+C8Wv0n2x0x/UO+vOuDFAvRyy3/Bui/5CxjC/bMT+MMdefSxD48KWMJ9gAk8AkYeou/bEAUsIQpYwn0zEXg7FnhDGzgSsIcqgGMpwMEe4GjUHi4DjucBBxyBI6J7yBY4pgwc9AaOyu9lA+C6BnDhBbgypFy62mtrwMU/4OokcPl0r+8CF6CBK+TAJXy1jMEWggBKaQDFSIByLnJBnC0pBBRlAspauYXB/NJqfnE6v7yfXyDRLzHpF+n0y5z6hWL9Urt+sWK/3LNfMNsvOe4XbffL3vuNA/zWC37zCr/9h99AxW9B4zfx8dsg+Y2k/FZcfjMzvx2c31DPb0noN3X022L6jUX91qx+c1u/PbDfYNlvUe03+fbbpPuN5v1W/U0VCZtJEjZRJGweSdg0kbBZJGGTRMLmkIRNEQmbQRI2QSRsPEnYcJGw0SRhg0XCxpKEDRUJG0kSNlAkbBxJ2DCRsFEkYYNEwsaQhA0RCRtBEjZAJOw+SdhtkbC7JGE3RcLukYTdEgm7QxJ2QyTsOknYZZGwqyRhF0XCrpGEXRIJu0ISdkEk7Jwk7FQk7Iwk7EQk7Jgk7FAk7MgkzMAkDCBKGECTMIAoYQBRwgCShBNAknACSBL+ASIPe+hC7q/+AAAAAElFTkSuQmCC'
  let smallPlaceholderImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAMAAAAOusbgAAAADFBMVEUAAADd3d0EBAT///9mYMUjAAAAA3RSTlNAtUBlglJzAAABCUlEQVR42u3ZMQ6DMBQFQYPvf+eUW9FOmpfW3xopIYC1597nPfjzPveemyzde55k6T7nxXJgsnWtHGblKCsHWTnGyiFWjpBywOeCdlvSbovabVm7DWi3Ee02pN3GtNugdhvVbsPabVy7bdBuW7TbJu22TbttVO73Vr9Zu/hn8hem/yv6m4+/3foHDJDBwxy+vgBXvCj6V2N/GPDHH3/g80dcf6gHsnMDtBuh3RDtxmg3SLtR2g3Tbpx2k3OxnIvlXC3n/h/2X7W/uLz7rkuuS65LrkuuS65LrkuuS65LrkuuS65LrkuuS65LrkuuS65LrkuuS65LrkuuS65Lrkt+yblWPrlWPrlW/gFdow25OuXCMgAAAABJRU5ErkJggg=='

  let maxDimension = Math.max(layer.width, layer.height)
  if (maxDimension <= 220) {
    return smallPlaceholderImageBase64
  } else if (maxDimension <= 416) {
    return mediumPlaceholderImageBase64
  } else {
    return largePlaceholderImageBase64
  }
}

export async function getLocalImageBase64 (layer, imageUrl) {
  // get last used path
  let lastUsedPath
  try {
    let activeConfigurationPreset = await Data.loadFileInDataFolder('activeConfigurationPreset.json')
    if (activeConfigurationPreset.path) {
      lastUsedPath = activeConfigurationPreset.path
    } else {
      lastUsedPath = null
    }
  } catch (e) {
    lastUsedPath = null
    log(e)
  }

  // get image path relative to preset dir
  let presetPath = lastUsedPath
  if (!presetPath) return

  let presetFolderComponents = presetPath.split('/')
  presetFolderComponents.pop()
  let imagePath = `${presetFolderComponents.join('/')}/${imageUrl}`

  // load local data
  let imageData
  try {
    imageData = await Data.loadFileWithPathInDataFolder(imagePath, true)
  } catch (e) {
    console.log(e)
  }

  if (imageData) {
    let prefix = (imageUrl.indexOf('jpg') > -1 || imageUrl.indexOf('jpeg') > -1) ? 'data:image/jpeg;base64,' : 'data:image/png;base64,'
    return prefix + base64ArrayBuffer(imageData)
  } else {
    return getRectanglePlaceholderBase64(layer)
  }
}

export function base64ArrayBuffer (arrayBuffer) {
  let base64 = ''
  let encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let bytes = new Uint8Array(arrayBuffer)
  let byteLength = bytes.byteLength
  let byteRemainder = byteLength % 3
  let mainLength = byteLength - byteRemainder
  let a, b, c, d
  let chunk
  // Main loop deals with bytes in chunks of 3
  for (let i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048) >> 12 // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032) >> 6 // 4032     = (2^6 - 1) << 6
    d = chunk & 63 // 63       = 2^6 - 1
    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
  }
  // Deal with the remaining bytes and padding
  if (byteRemainder === 1) {
    chunk = bytes[mainLength]
    a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2
    // Set the 4 least significant bits to zero
    b = (chunk & 3) << 4 // 3   = 2^2 - 1
    base64 += encodings[a] + encodings[b] + '=='
  } else if (byteRemainder === 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]
    a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008) >> 4 // 1008  = (2^6 - 1) << 4
    // Set the 2 least significant bits to zero
    c = (chunk & 15) << 2 // 15    = 2^4 - 1
    base64 += encodings[a] + encodings[b] + encodings[c] + '='
  }
  return base64
}
