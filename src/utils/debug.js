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


export const drawDebugPath = function(scene, path) {
  // draws lines on the screen based on an array of vectors
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


export const makeLoopingIterator = function(array) {
  // Iterator that resets the index once the next() function is called after the last element
  // used for quickly cycling through scenes etc
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

