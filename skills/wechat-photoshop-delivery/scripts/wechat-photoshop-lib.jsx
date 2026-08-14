/*
 * Reusable Photoshop ExtendScript helpers for editable WeChat longform delivery.
 * Project-specific copy, layout and assets must stay outside this library.
 */
var WechatPS = (function () {
  function requirePositive(value, label) {
    if (!(value > 0)) throw new Error(label + " must be greater than zero");
  }

  function color(hex) {
    var value = String(hex).replace("#", "");
    var c = new SolidColor();
    c.rgb.hexValue = value;
    return c;
  }

  function resolveFont(candidates) {
    var i;
    var j;
    var candidate;
    var font;
    var names;
    for (i = 0; i < candidates.length; i += 1) {
      candidate = String(candidates[i]).toLowerCase();
      for (j = 0; j < app.fonts.length; j += 1) {
        font = app.fonts[j];
        names = [font.postScriptName, font.name, font.family];
        if (
          String(names[0]).toLowerCase() === candidate ||
          String(names[1]).toLowerCase() === candidate ||
          String(names[2]).toLowerCase() === candidate
        ) return font.postScriptName;
      }
    }
    return null;
  }

  function createDocument(name, width, height, resolution) {
    requirePositive(width, "document width");
    requirePositive(height, "document height");
    app.preferences.rulerUnits = Units.PIXELS;
    app.preferences.typeUnits = TypeUnits.PIXELS;
    var doc = app.documents.add(
      width,
      height,
      resolution || 72,
      name,
      NewDocumentMode.RGB,
      DocumentFill.TRANSPARENT
    );
    doc.activeLayer.name = "__SEED__";
    return doc;
  }

  function cleanupSeed(doc) {
    var i;
    for (i = doc.artLayers.length - 1; i >= 0; i -= 1) {
      if (doc.artLayers[i].name === "__SEED__") doc.artLayers[i].remove();
    }
  }

  function group(doc, parent, name) {
    var item = parent ? parent.layerSets.add() : doc.layerSets.add();
    item.name = name;
    return item;
  }

  function solidLayer(doc, parent, name, x, y, width, height, hex, opacity) {
    requirePositive(width, name + " width");
    requirePositive(height, name + " height");
    var layer = doc.artLayers.add();
    layer.name = name;
    doc.activeLayer = layer;
    doc.selection.select([[x, y], [x + width, y], [x + width, y + height], [x, y + height]]);
    doc.selection.fill(color(hex));
    doc.selection.deselect();
    if (typeof opacity === "number") layer.opacity = opacity;
    if (parent) layer.move(parent, ElementPlacement.INSIDE);
    return layer;
  }

  function lineLayer(doc, parent, name, x, y, width, height, hex, opacity) {
    return solidLayer(doc, parent, name, x, y, width, height, hex, opacity);
  }

  function textLayer(doc, parent, spec) {
    requirePositive(spec.width, spec.name + " text width");
    requirePositive(spec.height, spec.name + " text height");
    requirePositive(spec.size, spec.name + " font size");
    requirePositive(spec.leading, spec.name + " leading");
    if (!spec.font) throw new Error("Audited PostScript font is required for " + spec.name);
    var layer = doc.artLayers.add();
    layer.kind = LayerKind.TEXT;
    layer.name = spec.name;
    var item = layer.textItem;
    item.kind = TextType.PARAGRAPHTEXT;
    item.position = [spec.x, spec.y];
    item.width = spec.width;
    item.height = Math.max(spec.height, spec.leading * 1.25);
    item.contents = spec.text;
    item.font = spec.font;
    item.size = spec.size;
    item.useAutoLeading = false;
    item.leading = spec.leading;
    item.color = color(spec.color || "000000");
    item.justification = spec.justification || Justification.LEFT;
    item.tracking = spec.tracking || 0;
    item.antiAliasMethod = AntiAlias.SHARP;
    if (parent) layer.move(parent, ElementPlacement.INSIDE);
    return layer;
  }

  function addRevealMask(doc, layer, x, y, width, height) {
    requirePositive(width, layer.name + " mask width");
    requirePositive(height, layer.name + " mask height");
    doc.activeLayer = layer;
    doc.selection.select([[x, y], [x + width, y], [x + width, y + height], [x, y + height]]);
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    desc.putClass(charIDToTypeID("Nw  "), charIDToTypeID("Chnl"));
    ref.putEnumerated(charIDToTypeID("Chnl"), charIDToTypeID("Chnl"), charIDToTypeID("Msk "));
    desc.putReference(charIDToTypeID("At  "), ref);
    desc.putEnumerated(charIDToTypeID("Usng"), charIDToTypeID("UsrM"), charIDToTypeID("RvlS"));
    executeAction(charIDToTypeID("Mk  "), desc, DialogModes.NO);
    doc.selection.deselect();
  }

  function placeEmbeddedSmartObject(doc, parent, spec) {
    requirePositive(spec.width, spec.name + " image width");
    requirePositive(spec.height, spec.name + " image height");
    var source = new File(spec.source);
    if (!source.exists) throw new Error("Missing source image: " + spec.source);
    var desc = new ActionDescriptor();
    desc.putPath(charIDToTypeID("null"), source);
    executeAction(charIDToTypeID("Plc "), desc, DialogModes.NO);
    var layer = doc.activeLayer;
    layer.name = spec.name;
    var bounds = layer.bounds;
    var currentWidth = bounds[2].as("px") - bounds[0].as("px");
    var currentHeight = bounds[3].as("px") - bounds[1].as("px");
    requirePositive(currentWidth, spec.name + " placed width");
    requirePositive(currentHeight, spec.name + " placed height");
    var fit = spec.objectFit === "contain" ? "contain" : "cover";
    var scale = (fit === "cover"
      ? Math.max(spec.width / currentWidth, spec.height / currentHeight)
      : Math.min(spec.width / currentWidth, spec.height / currentHeight));
    scale *= typeof spec.zoom === "number" ? spec.zoom : 1;
    layer.resize(scale * 100, scale * 100, AnchorPosition.MIDDLECENTER);
    bounds = layer.bounds;
    var left = bounds[0].as("px");
    var top = bounds[1].as("px");
    var placedWidth = bounds[2].as("px") - left;
    var placedHeight = bounds[3].as("px") - top;
    var focusX = typeof spec.focusX === "number" ? spec.focusX : 0.5;
    var focusY = typeof spec.focusY === "number" ? spec.focusY : 0.5;
    var focalX = left + placedWidth * focusX;
    var focalY = top + placedHeight * focusY;
    layer.translate(spec.x + spec.width / 2 - focalX, spec.y + spec.height / 2 - focalY);
    addRevealMask(doc, layer, spec.x, spec.y, spec.width, spec.height);
    if (parent) layer.move(parent, ElementPlacement.INSIDE);
    return layer;
  }

  function savePsd(doc, filePath) {
    var options = new PhotoshopSaveOptions();
    options.layers = true;
    options.embedColorProfile = true;
    options.maximizeCompatibility = true;
    doc.saveAs(new File(filePath), options, true, Extension.LOWERCASE);
  }

  function savePsb(doc, filePath) {
    var options = new LargeDocumentFormatOptions();
    options.layers = true;
    doc.saveAs(new File(filePath), options, true, Extension.LOWERCASE);
  }

  function savePngCopy(doc, filePath) {
    var copy = doc.duplicate(doc.name + "_preview", false);
    var options = new PNGSaveOptions();
    options.compression = 6;
    options.interlaced = false;
    copy.saveAs(new File(filePath), options, true, Extension.LOWERCASE);
    copy.close(SaveOptions.DONOTSAVECHANGES);
    app.activeDocument = doc;
  }

  function hasMask(doc, layer) {
    doc.activeLayer = layer;
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    var desc = executeActionGet(ref);
    var key = stringIDToTypeID("hasUserMask");
    return desc.hasKey(key) && desc.getBoolean(key);
  }

  function collectLayers(doc, container, state) {
    var i;
    for (i = 0; i < container.layers.length; i += 1) {
      var layer = container.layers[i];
      state.names.push(layer.name);
      if (layer.typename === "LayerSet") {
        state.groupCount += 1;
        collectLayers(doc, layer, state);
      } else {
        if (layer.kind === LayerKind.TEXT) {
          state.textCount += 1;
          state.fonts.push({ name: layer.name, postScriptName: layer.textItem.font });
        }
        if (layer.kind === LayerKind.SMARTOBJECT) {
          state.smartObjectCount += 1;
          if (hasMask(doc, layer)) state.maskCount += 1;
        }
      }
    }
  }

  function jsonEscape(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/\"/g, "\\\"").replace(/\r/g, "\\r").replace(/\n/g, "\\n");
  }

  function jsonSerialize(value) {
    if (value === null || typeof value === "undefined") return "null";
    if (typeof value === "string") return "\"" + jsonEscape(value) + "\"";
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (value instanceof Array) {
      var arrayParts = [];
      var i;
      for (i = 0; i < value.length; i += 1) arrayParts.push(jsonSerialize(value[i]));
      return "[" + arrayParts.join(",") + "]";
    }
    var objectParts = [];
    var key;
    for (key in value) if (value.hasOwnProperty(key)) objectParts.push(jsonSerialize(key) + ":" + jsonSerialize(value[key]));
    return "{" + objectParts.join(",") + "}";
  }

  function writeLayerQa(doc, filePath, expectedNames, expectedFonts, expectations) {
    expectations = expectations || {};
    var state = { names: [], fonts: [], groupCount: 0, textCount: 0, smartObjectCount: 0, maskCount: 0 };
    collectLayers(doc, doc, state);
    var missing = [];
    var i;
    for (i = 0; i < expectedNames.length; i += 1) {
      if (state.names.join("\n").indexOf(expectedNames[i]) === -1) missing.push(expectedNames[i]);
    }
    var substitutions = 0;
    for (i = 0; i < state.fonts.length; i += 1) {
      var expected = expectedFonts[state.fonts[i].name];
      if (expected && expected !== state.fonts[i].postScriptName) substitutions += 1;
    }
    var countsMatch = true;
    if (typeof expectations.textCount === "number") countsMatch = countsMatch && state.textCount === expectations.textCount;
    if (typeof expectations.smartObjectCount === "number") countsMatch = countsMatch && state.smartObjectCount === expectations.smartObjectCount;
    if (typeof expectations.maskCount === "number") countsMatch = countsMatch && state.maskCount === expectations.maskCount;
    var data = {
      status: missing.length === 0 && substitutions === 0 && countsMatch ? "PASS" : "FAIL",
      canvas: { width: doc.width.as("px"), height: doc.height.as("px") },
      textLayerCount: state.textCount,
      smartObjectCount: state.smartObjectCount,
      maskCount: state.maskCount,
      groupCount: state.groupCount,
      missingExpectedLayers: missing,
      fontSubstitutionCount: substitutions,
      fonts: state.fonts
    };
    var file = new File(filePath);
    file.encoding = "UTF8";
    file.open("w");
    file.write(jsonSerialize(data));
    file.close();
    return data;
  }

  return {
    color: color,
    resolveFont: resolveFont,
    createDocument: createDocument,
    cleanupSeed: cleanupSeed,
    group: group,
    solidLayer: solidLayer,
    lineLayer: lineLayer,
    textLayer: textLayer,
    addRevealMask: addRevealMask,
    placeEmbeddedSmartObject: placeEmbeddedSmartObject,
    savePsd: savePsd,
    savePsb: savePsb,
    savePngCopy: savePngCopy,
    writeLayerQa: writeLayerQa
  };
}());
