/**
 * Populator
 *
 * Provides functionality to populate layers.
 */

// import * as Data from './data'
// import Options, * as OPTIONS from '../library/options'
import * as Core from '../../core'
import * as Gui from './gui'
import * as Storage from './storage'
import Strings, * as STRINGS from '../../core/library/strings'
import Context from './context'
import * as Actions from './actions'
import {
  isGroupLike,
  getRectanglePlaceholderBase64,
  getLocalImageBase64,
  base64ArrayBuffer
} from './utils';

import xd from './xd'

const {
  Artboard,
  Group,
  RepeatGrid,
  Text,
  Rectangle,
  ImageFill,
  SymbolInstance
} = xd('scenegraph')
const commands = xd('commands')

let fullDataSet;
let _POPULATED_ONE_LAYER_ = false;
 // track used data rows
 let _USED_ROWS_ = [];

export async function populateLayers (layers, data, opt) {

  // console.log('populating layers: ', layers);
  // console.log('options:', opt);

  fullDataSet = data
  _POPULATED_ONE_LAYER_ = false

  // track populated layers
  let populatedLayers = []

  await Storage.load()

  async function loopLayers(layers) {
    // populate each root layer
    for (let i = 0; i < layers.length; i++) {
      let layer = layers[i] || layers.at(i);
      let dataRow = Core.populator.selectDataRow(
        data, _USED_ROWS_, opt.randomizeData
      );
      //console.log("populating layer:", layer);
      populatedLayers.push(await populateLayer(layer, dataRow, opt))
    }
  }

  if (
    layers.length
    && layers.length === 1
    && layers[0]
    && isGroupLike(layers[0])
  ) {
    let initial_layers = layers;
    let initial_root = Context().root;
    let structure;
    let layers_to_loop = layers[0].children;
    layers[0] instanceof Group
      && (structure = degroup(layers[0]))
      && (layers_to_loop = Context().selection.items)
      || (Context(layers[0], initial_root));

    // console.log('-------\ngroup context', layers_to_loop);

    await loopLayers(layers_to_loop);
    layers[0] instanceof Group && regroup(structure);
    populatedLayers = Context().selection.items;
  }
  else {
    await loopLayers(layers);
  }

  await Storage.save()

  // restore selection to populated layers
  console.log('Populated:', populatedLayers)
  Context().selection.items = populatedLayers
  // Empty used rows
  _USED_ROWS_ = [];
  if (!_POPULATED_ONE_LAYER_) {
    await Gui.createAlert(Strings(STRINGS.POPULATING_FAILED), Strings(STRINGS.NO_MATCHING_KEYS))
    await clearLayers(populatedLayers)
  }
}

export async function populateLayer (layer, data, opt) {

  if (layer instanceof Artboard) {
    await populateArtboardLayer(layer, data, opt)
    Actions.performActions(layer, data)
  }

  let structure;

  async function degroupAndPopulate(layer) {
    // console.log('degrouping: ', layer );
    let destructure = degroup(layer);
    let ctx_items = Context().selection.items;

    for (let i = 0; i < ctx_items.length; i++) {
      let ungroupedLayer = ctx_items[i]

      if (ungroupedLayer instanceof Group) {
        //console.log('relooping group: ', ungroupedLayer);
        await degroupAndPopulate(ungroupedLayer);
      }
      if (ungroupedLayer instanceof RepeatGrid) {
        //console.log('populating RepeatGrid: ', ungroupedLayer)
        await populateRepeatGridLayer(ungroupedLayer, data, opt)
      }
      if (ungroupedLayer instanceof Text) {
        console.log('-------------');
        // console.log('populating text: ', ungroupedLayer);
        await populateTextLayer(ungroupedLayer, data, opt)
      }
      if (ungroupedLayer instanceof Rectangle) {
        //console.log('populating Rectangle: ', ungroupedLayer);
        await populateRectangleLayer(ungroupedLayer, data, opt)
      }

      Actions.performActions(ungroupedLayer, data)
    }

    structure = destructure;

    // console.log('regrouping: ', layer);
    regroup(destructure)
  }

  await degroupAndPopulate(layer);

  return structure.layer
}

async function populateArtboardLayer (layer, data, opt) {
  let populatedString
  let originalLayerData = Storage.get(layer.guid)
  if (originalLayerData) {
    populatedString = originalLayerData.name
  }
  else {
    populatedString = layer.name

    Storage.set(layer.guid, {
      name: layer.name
    })
  }

  let placeholders = Core.placeholders.extractPlaceholders(populatedString)
  placeholders.forEach((placeholder) => {

    // populate placeholder found in the original text
    let populatedPlaceholder = Core.placeholders.populatePlaceholder(placeholder, data, opt.defaultSubstitute, true).populated

    if (Core.placeholders.populatePlaceholder(placeholder, data, opt.defaultSubstitute, true).hasValueForKey) _POPULATED_ONE_LAYER_ = true

    // replace original placeholder string (e.g. {firstName}) with populated placeholder string
    populatedString = populatedString.replace(placeholder.string, populatedPlaceholder)
  })

  if (!populatedString.length) populatedString = ' '

  // set new name
  layer.name = populatedString
}

async function populateRepeatGridLayer (layer, data, opt) {
  let dataSeries = {}
  let usedRows = []
  let dataRows = []
  let loop = 0;
  const _INITIAL_CTX_ = Context();

  let numberOfDataRows = Math.min(layer.children.length, fullDataSet.length);

  for (let i = 0; i < numberOfDataRows; i++) {
    dataRows.push(Core.populator.selectDataRow(fullDataSet, usedRows, opt.randomizeData))
  }

  async function textLayer(childLayer) {

    if (!dataSeries[childLayer.guid]) { dataSeries[childLayer.guid] = [] }

    for (let i = 0; i < dataRows.length; i++) {
      let populatedString;
      let originalLayerData = Storage.get(childLayer.guid)
      if (originalLayerData) {
        if (childLayer.name === originalLayerData.text) {
          populatedString = originalLayerData.text
        } else {
          let p = Core.placeholders.extractPlaceholders(childLayer.name)
          if (p.length) {
            populatedString = childLayer.name
          } else {
            populatedString = originalLayerData.text
          }
        }
      }
      else {
        if (childLayer.name === childLayer.text) {
          populatedString = childLayer.text
        } else {
          let p = Core.placeholders.extractPlaceholders(childLayer.name)
          if (p.length) {
            populatedString = childLayer.name
          } else {
            populatedString = childLayer.text
          }
        }

        Storage.set(childLayer.guid, {
          text: childLayer.text
        })
      }

      let placeholders = Core.placeholders
        .extractPlaceholders(populatedString)

      placeholders.forEach((placeholder) => {
          let populatedPlaceholder = Core
            .placeholders
            .populatePlaceholder(
              placeholder, dataRows[i], opt.defaultSubstitute, true
            )
            .populated

        if (
          Core.placeholders.populatePlaceholder(
            placeholder, dataRows[i], opt.defaultSubstitute, true
          ).hasValueForKey
        ) {
          _POPULATED_ONE_LAYER_ = true
        }

        populatedString = populatedString
          .replace(placeholder.string, populatedPlaceholder)
      })

      if (!populatedString.length) populatedString = ' '

      dataSeries[childLayer.guid].push(populatedString)

      if (i === dataRows.length - 1) {
        layer.attachTextDataSeries(childLayer, dataSeries[childLayer.guid])
      }
    }
  }

  async function rectangleLayer(childLayer) {
    if (!dataSeries[childLayer.guid]) dataSeries[childLayer.guid] = []

    // extract image placeholder from layer name
    let imagePlaceholder = Core.placeholders.extractPlaceholders(childLayer.name)[0]
    if (!imagePlaceholder) return

    if (Core.placeholders.populatePlaceholder(imagePlaceholder, dataRows[0], opt.defaultSubstitute, true).hasValueForKey) {
      _POPULATED_ONE_LAYER_ = true
    } else {
      return
    }

    let images = await Promise.all(dataRows.map(async dataRow => {

      // get url by populating the placeholder
      let imageUrl = Core
        .placeholders
        .populatePlaceholder(
          imagePlaceholder, dataRow, opt.defaultSubstitute, true
        ).populated;
      imageUrl = imageUrl.replace(/\s/g, '%20')

      //= ================================================
      // get image base64
      if (imageUrl.startsWith('http')) {

        let response
        try {
          response = await global.fetch(imageUrl)
        } catch (e) {
          console.log(e)
        }

        if (response) {
          const buffer = await response.arrayBuffer()
          let base64Flag = 'data:image/jpeg;base64,'
          let imageStr = base64ArrayBuffer(buffer)

          return Promise.resolve(base64Flag + imageStr)
        } else {
          return Promise.resolve(getRectanglePlaceholderBase64(childLayer))
        }
      }
      else {
        return Promise.resolve(await getLocalImageBase64(childLayer, imageUrl))
      }
    }))

    //= ================================================

    images.forEach(image => {
      const imageFill = new ImageFill(image)
      dataSeries[childLayer.guid].push(imageFill)
    })

    if (dataSeries[childLayer.guid].length) {
      await layer.attachImageDataSeries(childLayer, dataSeries[childLayer.guid])
    }
  }

  async function mapChildren(children) {
      loop++;
      await children.map(async (childLayer) => {
        //console.log('childLayer mapping:', typeof childLayer, childLayer);

        if (loop > 100) {
          //console.log('Bailing out. Too Many loops.')
          return;
        }

        if (childLayer instanceof Text) {
          //console.log('found text', childLayer);
          await textLayer(childLayer);
        }

        if (childLayer instanceof Rectangle) {
          await rectangleLayer(childLayer);
        }

        if (isGroupLike(childLayer)) {
          //console.log('------\nfound group:', childLayer);

          let ctx = Context(childLayer);
          if (childLayer instanceof SymbolInstance) {
            await Gui.createAlert("Warning: Components inside Repeat Grids cannot be populated", "Repeat Grids must be comprised of regular groups (or plain objects). All non-components will still be populated as expected.").then(()=> {
              return
            });
          }
          await mapChildren(childLayer.children);
          Context(_INITIAL_CTX_);
        }
      })
  }

  //console.log('mapping children:', layer.children.at(0));
  await mapChildren(layer.children.at(0).children)

}

async function populateTextLayer (layer, data, opt) {

  let populatedString
  let originalLayerData = Storage.get(layer.guid)

  console.log('text layer:', layer)

  // console.log('orig layer: ', originalLayerData)
  if (originalLayerData) {
    if (layer.name === originalLayerData.text) {
      populatedString = originalLayerData.text
    } else {
      let p = Core.placeholders.extractPlaceholders(layer.name)
      if (p.length) {
        populatedString = layer.name
      } else {
        populatedString = originalLayerData.text
      }
    }
  }
  else {
    if (layer.name === layer.text) {
      populatedString = layer.text
    } else {
      let p = Core.placeholders.extractPlaceholders(layer.name)
      if (p.length) {
        populatedString = layer.name
      } else {
        populatedString = layer.text
      }
    }

    Storage.set(layer.guid, {
      text: layer.text
    })
  }

  let extractedPlaceholders = Core.placeholders
    .extractPlaceholders(populatedString);

    console.log('extracted: ', extractedPlaceholders);

  if (extractedPlaceholders && extractedPlaceholders.length) {

    extractedPlaceholders
      .forEach((placeholder) => {
        // populate placeholder found in the original text
        let populatedPlaceholder = Core
          .placeholders
          .populatePlaceholder(
            placeholder, data, opt.defaultSubstitute, true
            )
          .populated

          console.log('placeholder: ', placeholder);
          console.log('data:', data);
          console.log('populated: ', populatedPlaceholder);

        _POPULATED_ONE_LAYER_ = Core
          .placeholders
          .populatePlaceholder(
            placeholder, data, opt.defaultSubstitute, true
          ).hasValueForKey
            ? true
            : _POPULATED_ONE_LAYER_;

        // replace original placeholder string (e.g. {firstName}) with populated placeholder string
        populatedString = populatedString
          .replace(placeholder.string, populatedPlaceholder)
    })
  }

  if (!populatedString.length) populatedString = ' '

  // set new text
  layer.text = populatedString

  // trim text
  if (layer.areaBox && layer.clippedByArea && populatedString.length > 1) {
    if (opt.trimText) trimText(layer, opt.insertEllipsis)
  }
}

async function populateRectangleLayer (layer, data, opt) {

  // extract image placeholder from layer name
  let imagePlaceholder = Core.placeholders.extractPlaceholders(layer.name)[0]
  if (!imagePlaceholder) return



  // get url by populating the placeholder
  let imageUrl = Core.placeholders.populatePlaceholder(
    imagePlaceholder, data, opt.defaultSubstitute, true
  ).populated
  if (Core.placeholders
      .populatePlaceholder(
        imagePlaceholder, data, opt.defaultSubstitute, true
      ).hasValueForKey
  ) {
    _POPULATED_ONE_LAYER_ = true
  } else {
    return
  }

  imageUrl = imageUrl.replace(/\s/g, '%20')

  // get image base64
  let imageBase64 = null
  if (imageUrl.startsWith('http')) {

    // get image from url
    imageBase64 = await new Promise(resolve => {

      let xhr = new XMLHttpRequest()
      xhr.open('GET', imageUrl, true)
      xhr.responseType = 'arraybuffer'
      xhr.onload = function (e) {

        let prefix = (imageUrl.indexOf('jpg') > -1) ? 'data:image/jpeg;base64,' : 'data:image/png;base64,'

        resolve(prefix + base64ArrayBuffer(xhr.response))
      }
      xhr.onerror = function (e) {
        resolve(getRectanglePlaceholderBase64(layer))
      }
      xhr.send()
    })
  }
  else {
    imageBase64 = await getLocalImageBase64(layer, imageUrl)
  }

  // set fill
  const imageFill = new ImageFill(imageBase64)
  layer.fill = imageFill
}

function trimText (layer, insertEllipsis) {
  let text = layer.text

  let tooShort = false
  while (layer.clippedByArea && !tooShort) {
    text = text.substring(0, text.length - 1)

    if (insertEllipsis) {
      layer.text = text + '…'
    } else {
      if (text.length > 0) {
        layer.text = text
      } else {
        tooShort = true
        layer.text = ' '
      }
    }
  }
}

export async function clearLayers (layers) {

  await Storage.load()

  // track cleared layers
  let clearedLayers = []

  // clear each root layer
  for (let i = 0; i < layers.length; i++) {
    let layer = layers[i]
    clearedLayers.push(await clearLayer(layer))
  }

  await Storage.save()

  // restore selection to cleared layers
  Context().selection.items = clearedLayers
}

export async function clearLayer (layer) {

  if (layer instanceof Artboard) {
    await clearArtboardLayer(layer)
  }

  let structure;

  async function loopAndClear(layer) {
    let destructure = degroup(layer);
    let ctx_items = Context().selection.items;

    for (let i = 0; i < ctx_items.length; i++) {
      let ungroupedLayer = ctx_items[i]

      if (ungroupedLayer instanceof Group) {
        await loopAndClear(ungroupedLayer);
      }
      if (ungroupedLayer instanceof RepeatGrid) {
        await clearRepeatGridLayer(ungroupedLayer)
      }
      if (ungroupedLayer instanceof Text) {
        await clearTextLayer(ungroupedLayer)
      }
      if (ungroupedLayer instanceof Rectangle) {
        await clearRectangleLayer(ungroupedLayer)
      }
    }
    structure = destructure
    regroup(structure);
  }

  await loopAndClear(layer);

  return structure.layer
}

async function clearArtboardLayer (layer) {

  let originalLayerData = Storage.get(layer.guid)
  if (!originalLayerData) return

  Storage.set(layer.guid, null)

  // set original name
  layer.name = originalLayerData.name
}

async function clearRepeatGridLayer (layer) {
  function loopLayers(layer) {
    layer.children.at(0).children.forEach((childLayer) => {
      if (childLayer instanceof Group) {
        loopLayers(childLayer);
      }

      if (childLayer instanceof Text) {
        let originalLayerData = Storage.get(childLayer.guid)
        if (!originalLayerData) return

        Storage.set(childLayer.guid, null)

        layer.attachTextDataSeries(childLayer, [originalLayerData.text])
      }
      if (childLayer instanceof Rectangle) {
        let imagePlaceholder = Core.placeholders.extractPlaceholders(childLayer.name)[0]
        if (!imagePlaceholder) return

        // const colorFill = new Color('#ffffff', 0)
        let imageFill = new ImageFill(getRectanglePlaceholderBase64(childLayer))
        layer.attachImageDataSeries(childLayer, [imageFill])
      }
    })
  }
  loopLayers(layer);
}

async function clearTextLayer (layer) {

  let originalLayerData = Storage.get(layer.guid)
  if (!originalLayerData) return

  Storage.set(layer.guid, null)

  // set original text
  layer.text = originalLayerData.text
}

async function clearRectangleLayer (layer) {

  let imagePlaceholder = Core.placeholders.extractPlaceholders(layer.name)[0]
  if (!imagePlaceholder) return

  let imageFill = new ImageFill(getRectanglePlaceholderBase64(layer))
  layer.fill = imageFill
}

function degroup (layer, nestedCall, parentStructure) {

  parentStructure = parentStructure || {}

  let structure = {
    name: layer.name,
    type: layer.constructor.name,
    guid: layer.guid,
    mask: !!layer.mask,
    layer: layer
  }

  if (layer instanceof Artboard || layer instanceof Group) {

    //console.log('Selecting layer (degroup): ', layer);

    let ctx = Context().selection.items = [layer];

    //console.log('New Context (degroup):', ctx);

    let children = []
    layer.children.forEach(childLayer => {
      children.push(childLayer)
    })

    commands.ungroup()

    structure.children = []
    children.reverse().forEach(childLayer => {
      structure.children.push(degroup(childLayer, true, structure))
    })

    Context().selection.items = []
  }

  if (!nestedCall) selectUngroupedLayers(structure)

  return structure
}

function selectUngroupedLayers (structure) {

  if (structure.children) {
    structure.children.forEach(child => {
      selectUngroupedLayers(child)
    })
  }
  else if (structure.layer) {

    if (Context().selection.items.indexOf(structure.layer) === -1) {

      Context().selection.items = [structure.layer].concat(Context().selection.items)
    }
  }
}

function regroup (structure) {

  let hasGroups = structure.children && structure.children.filter(child => !!child.children).length

  if (hasGroups) {

    let childGroups = []
    structure.children.forEach(child => {
      regroup(child)
      childGroups.push(child.layer)
    })

    if (structure.type === 'Group') {

      Context().selection.items = childGroups

      if (structure.mask) {
        commands.createMaskGroup()
      } else {
        commands.group()
      }

      structure.layer = Context().selection.items[0]
      structure.layer.name = structure.name
    }
    else if (structure.type === 'Artboard') {
      structure.layer.name = structure.name
    }
  }
  else {

    if (structure.children) {

      Context().selection.items = []
      structure.children.forEach(child => {

        child.layer.name = child.name

        Context().selection.items = [child.layer].concat(Context().selection.items)
      })

      if (structure.mask) {
        commands.createMaskGroup()
      } else {
        commands.group()
      }

      structure.layer = Context().selection.items[0]
      structure.layer.name = structure.name

    } else if (structure.layer) {

      Context().selection.items = [structure.layer]
      structure.layer.name = structure.name
    }
  }
}
