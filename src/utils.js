//////////////////////////////////////////////////
//        global helper functions               //
//////////////////////////////////////////////////


// ------------ Math stuff -------------------- //

const map = function(value, low1, high1, low2, high2) {
  return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}

const choose = function(choices){
  var index = Math.floor(Math.random() * choices.length);
  return choices[index];
}

const chooseWeighted = function(choices, weights) {
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


const getNormallyDistributedRandomNumber = function(mean, stddev) {
  const { z0, _ } = _boxMullerTransform();
  return z0 * stddev + mean;
}


const isNumeric = function(n) { 
  return !isNaN(parseFloat(n)) && isFinite(n); 
}

const convertIndexTo1D = function(x, y, width) {
  // converts a 2D index to 1D
  return x + y * width;
}

const convertIndexTo2D = function(index, width) {
  // converts a 1D index to 2D
  return {x: index % width, y: parseInt(index / width)};
}


// // -------------- Formatting ------------------------------------ //

const toUTF16 = function(codePoint) {
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


const hexColor = function(number) {
  // takes a Number and converts it to a hexadecimal color string
  // e.g. 7970919 becomes '#79a067'
  return '#' + parseInt(number).toString(16);
}


// // -------------- Monkey patches -------------------------------- //

String.prototype.format = function() {
  // string formatting similar to pythons str.format
  // usage: '{0} {1}'.format('hello', 'world')
  // CAUTION: much slower than ES6 template strings, use only when absolutely necessary
  a = this;
  for (k in arguments) {
    a = a.replace("{" + k + "}", arguments[k])
  }
  return a
}

const sumArray = function(array) {
  return array.reduce((a, b) => { return a + b }, 0);
}


const debugDraw = (layer, scene) => {
  // https://github.com/ourcade/phaser3-dungeon-crawler-starter/blob/master/src/utils/debug.ts
  // add to create() after the map layer
	const debugGraphics = scene.add.graphics().setAlpha(0.7)
	layer.renderDebug(debugGraphics, {
		tileColor: null,
		collidingTileColor: new Phaser.Display.Color(243, 234, 48, 255),
		faceColor: new Phaser.Display.Color(40, 39, 37, 255)
	})
}


const checkCollisionGroup = function(object, groupArray) {
  let collisions = [];
  groupArray.forEach(child => {
    let rect1 = object.getBounds();
    let rect2 = child.body;
    if (Phaser.Geom.Rectangle.Overlaps(rect1, rect2)) {
      collisions.push(child);
    }
  });

  return collisions;
}


const getNestedKey = function(json, key) {
  const [k, ...rest] = key instanceof Array ? key : key.split('.');
  if(rest.length === 0 || typeof json[k] === 'undefined' || json[k] === null)
    return json[k];
  return getNestedKey(json[k], rest);
}


const getAvgColor = function(scene, key, frame=null) {
  let texture = scene.textures.getFrame(key, frame);
  let sumRed = 0;
  let sumGreen = 0;
  let sumBlue = 0;

  let pixelCount = 0;  // doesn't count fully transparent pixels

  for (let i = 0; i < texture.width; i++) {
    for (let j = 0; j < texture.height; j++) {
      let color = scene.textures.getPixel(i, j, key, frame);
      // console.log(color.red, color.green, color.blue, color.alpha);
      if (color.alpha > 0) {
        sumRed += Math.pow(color.red, 2);
        sumGreen += Math.pow(color.green, 2);
        sumBlue += Math.pow(color.blue, 2);
        pixelCount++;
      }
    }
  }
  return new Phaser.Display.Color(
    parseInt(Math.sqrt(sumRed / pixelCount)),
    parseInt(Math.sqrt(sumGreen / pixelCount)),
    parseInt(Math.sqrt(sumBlue / pixelCount)),
    255
  );
}

const getAvgColorButFaster = function(scene, key, frame=null) {
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


const deepcopy = function(object) {
  return JSON.parse(JSON.stringify(object));
}


var DELAYTIMER = 100;   // TODO: temporary solution!!


const getCursorDirections = function(scene, delay=null, delta) {

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
  return { x: dirX, y: dirY };
}


const addKeysToScene = function(scene, keyMapping) {
  let keys = {};
  for (const key in keyMapping) {
    keys[key] = scene.input.keyboard.addKey(keyMapping[key]);
  }
  return keys;
}