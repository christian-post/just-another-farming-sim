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


export const getScreenPoint = function(camera, x, y) {
  // translates a position from world to screen coordinates
  let cameraView = camera.worldView;
  let screenX = (x - cameraView.x) * camera.zoom;
  let screenY = (y - cameraView.y) * camera.zoom;
  return { x: screenX, y: screenY };
}


// var DELAYTIMER = 100;   // TODO: temporary solution, put in InputHandler!!

// export const getCursorDirections = function(scene, delay=null, delta) {
//   let dirX = 0;
//   let dirY = 0;

//   // check gamepad first
//   if (scene.pad) {

//     if (delay && DELAYTIMER >= 0) {
//       DELAYTIMER -= delta;
//     } else {
//       let right = scene.manager.inputHandler.gamepadMapping.right;
//       let left = scene.manager.inputHandler.gamepadMapping.left;
//       let down = scene.manager.inputHandler.gamepadMapping.down;
//       let up = scene.manager.inputHandler.gamepadMapping.up;
      
//       dirX = scene.pad.getButtonValue(right) - scene.pad.getButtonValue(left);
//       dirY = scene.pad.getButtonValue(down) - scene.pad.getButtonValue(up);

//       if (delay) { 
//         DELAYTIMER = delay; 
//         if (dirX === 0 && dirY === 0) {
//           DELAYTIMER = 0;
//         }
//       }
//     }
//   } else {
//     let right = scene.keys.right;
//     let left = scene.keys.left;
//     let down = scene.keys.down;
//     let up = scene.keys.up;
  
//     dirX = scene.input.keyboard.checkDown(right, delay) - scene.input.keyboard.checkDown(left, delay);
//     dirY = scene.input.keyboard.checkDown(down, delay) - scene.input.keyboard.checkDown(up, delay);
    
//   }
  
//   return new Phaser.Math.Vector2(dirX, dirY);
// }


// export const addKeysToScene = function(scene, keyMapping) {
//   let keys = {};
//   for (const key in keyMapping) {
//     keys[key] = scene.input.keyboard.addKey(keyMapping[key]);
//   }
//   return keys;
// }

