//////////////////////////////////////////////////
//        global helper functions               //
//////////////////////////////////////////////////


// ------------ Math stuff -------------------- //

export const map = function(value, low1, high1, low2, high2) {
  return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}

export const choose = function(choices){
  var index = Math.floor(Math.random() * choices.length);
  return choices[index];
}

export const chooseWeighted = function(choices, weights) {
  // https://blobfolio.com/2019/randomizing-weighted-choices-in-javascript/

  if (choices.length != weights.length) {
    console.warn(' Mismatching length of weights array! Returning random item instead.');
    return choose(choices);
  }

  let total = sumArray(weights);
  const threshold = Math.random() * total;

  total = 0;
  for (let i = 0; i < choices.length - 1; ++i) {
    // Add the weight to our running total.
    total += weights[i];

    // If this value falls within the threshold, we're done!
    if (total >= threshold) {
      return choices[i];
    }
  }
  // return the last item
  return choices[choices.length - 1];
}


const _boxMullerTransform = function() {
  // calculates the Box Muller Transformation (used for normally distributed sampling)
  // https://mika-s.github.io/javascript/random/normal-distributed/2019/05/15/generating-normally-distributed-random-numbers-in-javascript.html
  const u1 = Math.random();
  const u2 = Math.random();
  
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
  
  return { z0, z1 };
}


export const getNormallyDistributedRandomNumber = function(mean, stddev) {
  const { z0, _ } = _boxMullerTransform();
  return z0 * stddev + mean;
}


export const isNumeric = function(n) { 
  return !isNaN(parseFloat(n)) && isFinite(n); 
}

export const convertIndexTo1D = function(x, y, width) {
  // converts a 2D index to 1D
  return x + y * width;
}

export const convertIndexTo2D = function(index, width) {
  // converts a 1D index to 2D
  return {x: index % width, y: parseInt(index / width)};
}


// // -------------- Formatting ------------------------------------ //

export const toUTF16 = function(codePoint) {
  // converts unicode code points (hex values) to utf-16 surrogate pairs
  // used for emojis etc.
  // http://www.2ality.com/2013/09/javascript-unicode.html
  let TEN_BITS = parseInt('1111111111', 2);
  function u(codeUnit) {
    return '\\u'+codeUnit.toString(16).toUpperCase();
  }

  if (codePoint <= 0xFFFF) {
    return u(codePoint);
  }
  codePoint -= 0x10000;

  // Shift right to get to most significant 10 bits
  let leadSurrogate = 0xD800 + (codePoint >> 10);

  // Mask to get least significant 10 bits
  let tailSurrogate = 0xDC00 + (codePoint & TEN_BITS);

  return u(leadSurrogate) + u(tailSurrogate);
}


export const hexColor = function(number) {
  // takes a Number and converts it to a hexadecimal color string
  // e.g. 7970919 becomes '#79a067'
  return '#' + parseInt(number).toString(16);
}


export const sumArray = function(array) {
  return array.reduce((a, b) => { return a + b }, 0);
}


export const capitalize = function(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}


export const debugDraw = (layer, scene, visible=true) => {
  // https://github.com/ourcade/phaser3-dungeon-crawler-starter/blob/master/src/utils/debug.ts
  // add to create() after the map layer
	const debugGraphics = scene.add.graphics()
    .setAlpha(0.5)
    .setVisible(visible);

	layer.renderDebug(debugGraphics, {
		tileColor: null,
		collidingTileColor: new Phaser.Display.Color(243, 234, 48, 255),
		faceColor: new Phaser.Display.Color(255, 0, 0, 255)
	});

  return debugGraphics;
}


export const checkCollisionGroup = function(object, groupArray) {
  let collisions = [];
  groupArray.forEach(child => {
    let rect1 = object.getBounds();
    let rect2;
    if (child.hasOwnProperty("interactionRect")) {
      // custom property of certain sprites
      rect2 = child.interactionRect.getBounds();
    } else {
      rect2 = child.body;
    }
    if (Phaser.Geom.Rectangle.Overlaps(rect1, rect2)) {
      collisions.push(child);
    }
  });

  return collisions;
}


export const getNestedKey = function(json, key) {
  const [k, ...rest] = key instanceof Array ? key : key.split('.');
  if(rest.length === 0 || typeof json[k] === 'undefined' || json[k] === null)
    return json[k];
  return getNestedKey(json[k], rest);
}


export const getAvgColor = function(scene, key, frame=null) {
  const { width, height } = scene.textures.getFrame(key, frame);
  let newTexture = scene.textures.createCanvas(key + '-new', width, height);
  newTexture.drawFrame(key, frame);
  newTexture.update();

  let colorArray = newTexture.getPixels(0, 0, width, height);

  let sumRed = 0;
  let sumGreen = 0;
  let sumBlue = 0;
  let pixelCount = 0;

  colorArray.forEach(row => {
    row.forEach(pixel=> {
      let color = Phaser.Display.Color.IntegerToRGB(pixel.color);
      if (pixel.alpha > 0) {
        sumRed += Math.pow(color.r, 2);
        sumGreen += Math.pow(color.g, 2);
        sumBlue += Math.pow(color.b, 2);
        pixelCount++;
      }
    });
  });

  newTexture.destroy();

  return new Phaser.Display.Color(
    parseInt(Math.sqrt(sumRed / pixelCount)),
    parseInt(Math.sqrt(sumGreen / pixelCount)),
    parseInt(Math.sqrt(sumBlue / pixelCount)),
    255
  );
}


export const deepcopy = function(object) {
  return JSON.parse(JSON.stringify(object));
}


var DELAYTIMER = 100;   // TODO: temporary solution!!


export const getCursorDirections = function(scene, delay=null, delta) {

  if (!scene.manager.hasControl) { 
    // return { x: 0, y: 0 }; 
    return new Phaser.Math.Vector2(0, 0);
  }

  let dirX = 0;
  let dirY = 0;

  // check gamepad first
  if (scene.pad) {

    if (delay && DELAYTIMER >= 0) {
      DELAYTIMER -= delta;
    } else {
      let right = scene.manager.gamepadMapping.right;
      let left = scene.manager.gamepadMapping.left;
      let down = scene.manager.gamepadMapping.down;
      let up = scene.manager.gamepadMapping.up;
      
      dirX = scene.pad.getButtonValue(right) - scene.pad.getButtonValue(left);
      dirY = scene.pad.getButtonValue(down) - scene.pad.getButtonValue(up);

      if (delay) { 
        DELAYTIMER = delay; 
        if (dirX === 0 && dirY === 0) {
          DELAYTIMER = 0;
        }
      }
    }
  } else {
    let right = scene.keys.right;
    let left = scene.keys.left;
    let down = scene.keys.down;
    let up = scene.keys.up;
  
    dirX = scene.input.keyboard.checkDown(right, delay) - scene.input.keyboard.checkDown(left, delay);
    dirY = scene.input.keyboard.checkDown(down, delay) - scene.input.keyboard.checkDown(up, delay);
    
  }
  // return { x: dirX, y: dirY };
  return new Phaser.Math.Vector2(dirX, dirY);
}


export const addKeysToScene = function(scene, keyMapping) {
  let keys = {};
  for (const key in keyMapping) {
    keys[key] = scene.input.keyboard.addKey(keyMapping[key]);
  }
  return keys;
}


export const vec2 = function(x, y) {
  // wrapper for Vector2, because less typing ;)
  if (typeof x === 'object') {
    return new Phaser.Math.Vector2(x.x, x.y);
  } else {
    return new Phaser.Math.Vector2(x, x);
  }
}


export const simplifyPath = function(path) {
  // reduceds an array of Vector2s to the corner points
  // e.g.
  /*
  ####
     #       ######
     #       #
     ####    #
        ######

  becomes

  #..#
     .       #....#
     .       .
     #..#    .
        #....#   
  */
 
  // insert the first node 
  let newPath = [];
  newPath.push(vec2(path[0]));

  // iterate to all but the last node
  for (let i = 1; i< path.length - 1; i++) {
    let previous = path[i - 1];
    let current = path[i];
    let next = path[i + 1];
    // compare current node to previous and next
    if ((current.x !== previous.x || current.x !== next.x) && (current.y !== previous.y || current.y !== next.y)) {
      newPath.push(vec2(path[i]));
    }
  }
  // insert the end node
  newPath.push(vec2(path[path.length - 1]));

  return newPath;
}


export const drawDebugPath = function(scene, path) {
  let graphics = scene.add.graphics();
  let tilesize = scene.registry.values.tileSize;

  graphics.lineStyle(4, 0x00ff00, 1);
  graphics.beginPath();
  graphics.moveTo(path[0].x * tilesize + tilesize / 2, path[0].y * tilesize + tilesize / 2);

  for (let i = 1; i < path.length; i++) {
    graphics.lineTo(path[i].x * tilesize + tilesize / 2, path[i].y * tilesize + tilesize / 2);
  }

  graphics.strokePath();

  return graphics;
}


export const getScreenPoint = function(camera, x, y) {
  // translates a position from world to screen coordinates
  let cameraView = camera.worldView;
  let screenX = (x - cameraView.x) * camera.zoom;
  let screenY = (y - cameraView.y) * camera.zoom;
  return { x: screenX, y: screenY };
}


export const makeLoopingIterator = function(array) {
  let index = 0;

  const rangeIterator = {
    next: function() {
      let result = array[index];
      if (index < array.length - 1) {
        index++;
      } else {
        index = 0;
      }
      return result;
    }
  };

  return rangeIterator;
}
