class OverworldScene extends Phaser.Scene {
  // Parent class for all overworld (in-game) scenes
  create(config) {
    // reference to the game manager scene
    this.manager = this.scene.get('GameManager');

    this.autoTileDict = {};   // Auto tiling indices 
    this.mapLayers = {};
    this.currentMap = null;
    this.pathfinder = null;

    this.hasArableLand = false; // flag that indicates if the makeAcre function can be called

    this.depthValues = {
      sprites: 2,
      mapAboveSprites: 4,
      daytimeOverlay: 10
    };

    // groups that all game scenes have
    this.allSprites = this.add.group(); 

    // objects that trigger a dialogue
    this.interactables = this.add.group();

    // light objects that are used for bitmasks
    this.lightcones = this.add.group();

    // sprites that the player can collect
    this.collectibles = this.add.group();

    this.npcs = this.add.group();
    this.npcs.runChildUpdate = true;

    // sprites that move around and should change their depth based on their y-position
    this.depthSortedSprites = this.add.layer();
    this.depthSortedSprites.setDepth(this.depthValues.sprites);

    // create the Player sprite for this scene
    this.player = new Player(this, 0, 0);
    if ('playerPos' in config) {
      this.player.setPosition(config.playerPos.x, config.playerPos.y);
    }

    if ('lastDir' in config) {
      this.player.lastDir = config.lastDir;
    }

    this.depthSortedSprites.add(this.player);

    // configure input
    this.buttonCallbacks = {
      inventory: ()=> {
        // pause the current overworld scene and show the Inventory
        this.scene.pause(this.scene.key);
        this.manager.toggleDaytimePause();
        this.scene.run('InventoryDisplay', this.scene.key);
      },
      interact: () => {
        this.manager.events.emit('player-interacts');
      },
      item1: () => {
        this.manager.events.emit('itemUsed', 'item1');
      },
      item2: () => {
        this.manager.events.emit('itemUsed', 'item2');
      },
      menu: () => {
        this.manager.events.emit('menuOpen');
      }
    }

    this.manager.configureKeys(this);

    // Gamepad functionality
    this.manager.checkForGamepad(this);

    // weather manager object
    this.weatherDisplayManager = new WeatherDisplayManager(this);
    this.hasWeather = false;

    // visual overlays for debugging
    if (DEBUG) {
      this.events.on('create', ()=> {
        this.add.grid(
          0, 0, this.mapLayers.layer1.width, this.mapLayers.layer1.height, 
          this.registry.values.tileSize, this.registry.values.tileSize, null, null, 0x333333, 0.25
          ).setOrigin(0);
  
        debugDraw(this.mapLayers.layer2, this);
        debugDraw(this.mapLayers.layer1, this);
      });
    }
  }

  makeTilemap(mapKey, numLayers, collisionLayers, layersDrawnAbove) {
    /* 
    mapKey: string -> tilemap key
    numLayers: int -> number of tile layers in Tilemap data
    collisionLayers: Array -> Layers that have collision info set (layer0, layer1 etc)
    layersDrawnAbove: Array -> Layers that are drawn on top of the sprites
    */

    this.currentMap = this.make.tilemap({ key: mapKey });
    const tileset = this.currentMap.addTilesetImage(this.registry.values.tilemapImages[mapKey]);

    this.currentMapKey = mapKey;

    // create map layers
    for (var i = 0; i < numLayers; i++) {
      this.mapLayers[`layer${i}`] = this.currentMap.createLayer(`layer${i}`, tileset);
    }

    // create collision
    collisionLayers.forEach(layer => {
      this.mapLayers[layer].setCollisionByProperty({ 'collides': true });
      this.physics.add.collider(this.player, this.mapLayers[layer]);
    });

    // draw the layers above the sprites
    layersDrawnAbove.forEach(layer => {
      this.mapLayers[layer].setDepth(this.depthValues.mapAboveSprites);
    });

    this.physics.world.setBounds(0, 0, this.mapLayers.layer1.width, this.mapLayers.layer1.height);

    // create map objects that trigger collision events with the interact rect
    if (this.currentMap.getObjectLayer('objects').visible) {
      let rawObjects = this.currentMap.getObjectLayer('objects').objects;
      
      rawObjects.forEach(obj => {
        // convert properties array to object
        obj.properties.forEach(p => {
          obj[p.name] = p.value;
        });
  
        // check elem.type and create an object accordingly
        this.createMapObject(obj);
      });
    }
  }

  createMapObject(object) {
    // instantiates sprites and game objects from Tiled data
    switch (object.type) {
      case 'dialogue':
        let options = object.hasOptions ? JSON.parse(object.options) : null;
        let optionsAreCallbacks = object.optionsAreCallbacks ? true : false;
        new DialogueTrigger(
          this, object.x, object.y, object.width, object.height, object.dialogueKey, options, optionsAreCallbacks
        );
        break;

      case 'light':
        let x = object.x + object.width / 2;
        let y = object.y + object.height;
        let lightcone = this.add.image(x, y, object.texture).setVisible(false);
        this.lightcones.add(lightcone);
        break;

      case 'sprite':
        let npc = new NPC(this, object.x, object.y, object.texture);
        if (object.multipleDialogue) {
          npc.setDialogue(JSON.parse(object.dialogue));
        } else {
          npc.setDialogue(object.dialogue);
        }
        npc.setBehaviour(object.behaviour);

        break;
      
      case 'vendor':
        let items = JSON.parse(object.items);
        new Vendor(this, object.x, object.y, object.texture, items);
        break;

      case 'teleport':
        new TeleportTrigger(this, object.x, object.y, object.width, object.height, object.target, object.targetX, object.targetY);
        break;

      default:
        console.log(`No object for ${object.type}, ${object}`);
    }
  }

  addPathfinding() {
    // adds the Easystar pathfinding to this overworld scene
    this.pathfinder = new EasyStar.js();
    this.pathfinder.setGrid(this.getTilemapCollisionArray('layer1'));
    this.pathfinder.setAcceptableTiles([false]);
  }

  getTilemapCollisionArray(layer) {
    let grid = [];
    for (let y = 0; y < this.currentMap.height; y++) {
      let col = [];
      for (let x = 0; x < this.currentMap.width; x++) {
        col.push(this.currentMap.getTileAt(x, y, true, layer).collides);
      }
      grid.push(col);
    }
    return grid;
  }

  setupCamera() {
    this.cameras.main.setBounds(0, 0, this.mapLayers.layer0.width, this.mapLayers.layer0.height);
    this.cameras.main.startFollow(this.player, true);
  }

  setupDaytimeOverlay() {
    this.daytimeOverlay = this.add.rectangle(
      0, 0, this.mapLayers.layer0.width, this.mapLayers.layer0.height, null, 0
    );
    this.daytimeOverlay.setOrigin(0);
    this.daytimeOverlay.setDepth(this.depthValues.daytimeOverlay);

    let dawnBegin = 4;
    let dawnMid = 5;
    let dawnEnd = 6;
    let dayBegin = 7;
    let duskBegin = 17;
    let duskMid = 18;
    let duskEnd = 19;
    let nightBegin = 20;
    let nightMid = 21;
    let nightEnd = 3;

    this.manager.events.on('setClock', time => {
      if (time.hour >= dayBegin && time.hour < duskBegin) {
        // no tint during the day
        this.daytimeOverlay.setFillStyle(null, 0);
      } else if ((time.hour >= duskBegin && time.hour < duskMid) || (time.hour >= dawnEnd && time.hour < dayBegin)) {
        this.daytimeOverlay.setFillStyle(0xcc7e4e, 0.3);
      } else if ((time.hour >= duskMid && time.hour < duskEnd) || (time.hour >= dawnMid && time.hour < dawnEnd)) {
        this.daytimeOverlay.setFillStyle(0xc860a1, 0.4);
      } else if ((time.hour >= duskEnd && time.hour < nightBegin) || (time.hour >= dawnBegin && time.hour < dawnMid)) {
        this.daytimeOverlay.setFillStyle(0x3b1c59, 0.5);
      } else if ((time.hour >= nightBegin && time.hour < nightMid) || (time.hour >= nightEnd && time.hour < dawnBegin)) {
        this.daytimeOverlay.setFillStyle(0x110c23, 0.7);
      } else if (time.hour >= nightMid || time.hour < nightEnd) {
        this.daytimeOverlay.setFillStyle(0x110c23, 0.95);
      }
    });
  }

  setupLightSources() {
    this.textureOverlay = this.add.renderTexture(
      0, 0, this.mapLayers.layer0.width, this.mapLayers.layer0.height
    )
      .setDepth(this.depthValues.daytimeOverlay)   // TODO is this needed? (daytime overlay depth is already set)
      .setVisible(false);

    this.playerLightcone = this.add.image(0, 0, 'lightcone').setVisible(false);

    let mask = this.daytimeOverlay.createBitmapMask(this.textureOverlay);
    mask.invertAlpha = true;
    this.daytimeOverlay.setMask(mask);
  }

  drawLightcones() {
    this.textureOverlay.clear();
    this.textureOverlay.draw(this.playerLightcone, this.player.x, this.player.y);

    this.lightcones.getChildren().forEach(child => {
      this.textureOverlay.draw(child, child.x, child.y);
    });
  }

  updateLightcones() {
    if (this.manager.isNight) {
      this.playerLightcone.setPosition(this.player.x, this.player.y);
      this.drawLightcones();
    } else {
      // TODO: check this only once when it is becoming day
      this.textureOverlay.clear();
    }
  }

  update(time, delta) {
    if (this.player) {
      this.player.update(delta);
    }

    // depth sort of sprites
    let sprites = this.depthSortedSprites.getChildren();
    sprites.forEach(sprite => {
      if (sprite.hasOwnProperty('depthSortY')) {
        sprite.setDepth(sprite.depthSortY);
      } else {
        sprite.setDepth(sprite.y);
      }
    });

    if (this.hasWeather) {
      this.weatherDisplayManager.update(delta);
    }
  }
}


class FarmScene extends OverworldScene {
  create(config) {
    super.create(config);

    this.hasArableLand = true;  // flag that indicates whether the player can create farmland
    this.hasWeather = true;
    
    // physics callback for collectible items
    this.physics.add.overlap(this.player, this.collectibles, (player, collectible)=> {
      collectible.collect();
    }); 

    // Crops that the player can grow
    this.crops = this.add.group();
    this.crops.runChildUpdate = true;

    this.autoTileDict = {
      grass: 681,
      0 : 888,     // 00000000
      2 : 682,    // 00000010
      8 : 683,    // 00001000
      10 : 684,   // 00001010
      11 : 685,   // 00001011
      16 : 686,   // 00010000
      18 : 687,   // 00010010
      22 : 688,   // 00010110

      24 : 721,   // 00011000
      26 : 722,   // 00011010
      27 : 723,   // 00011011
      30 : 724,   // 00011110
      31 : 725,   // 00011111
      64 : 726,   // 00100000
      66 : 727,   // 00111110
      72 : 728,   // 01001000

      74 : 761,   // 01001010
      75 : 762,   // 01001011
      80 : 763,   // 01010000
      82 : 764,   // 01010010
      86 : 765,   // 01010110
      88 : 766,   // 01011000
      90 : 767,   // 01011010
      91 : 768,   // 01011011

      94 : 801,   // 01011110
      95 : 802,   // 01011111
      104 : 803,  // 01101000
      106 : 804,  // 01101010
      107 : 805,  // 01101011
      120 : 806,  // 01111000
      122 : 807,  // 01111010
      123 : 808,  // 01111011

      126 : 841,  // 01111110
      127 : 842,  // 01111111
      208 : 843,  // 11001000
      210 : 844,  // 11010010
      214 : 845,  // 11010110
      216 : 846,  // 11011000
      218 : 847,  // 11011010
      219 : 848,  // 11011011

      222 : 881,  // 11011110
      223 : 882,  // 11011111
      248 : 883,  // 11111000
      250 : 884,  // 11111010
      251 : 885,  // 11111011
      254 : 886,  // 11111110
      255 : 887   // 11111111
    };

    this.makeTilemap('farm', 4, ['layer1', 'layer2'], ['layer3']);
    this.setupCamera();

    // pathfinding for the NPCs
    this.addPathfinding();

    this.arableMap = new Array(this.currentMap.width * this.currentMap.height).fill(null);

    // day and night tint
    this.setupDaytimeOverlay();

    // light sources at night
    this.setupLightSources();

    // Start the background music
    this.manager.playMusic('overworld');

  }


  isArable(x, y) {
    // helper function, might delete
    let patch = this.arableMap[convertIndexTo1D(x, y, this.currentMap.width)];
    return patch !== undefined && patch !== null;
  }

  rebuildArableLayer() {
    for (let x = 0; x < this.currentMap.width; x++) {
      for (let y = 0; y < this.currentMap.height; y++) {
      
        let indexX = x;
        let indexY = y;
        let tileIndex;   // corresponds to the tileset image

        if (!this.isArable(indexX, indexY)) {
          // if it is not arable land, just use the grass tile
          tileIndex = this.autoTileDict.grass;
        } else {
          // see https://github.com/christianpostprivate/Autotiles

          let bitmask = new Array(8).fill(0);

          if (this.isArable(indexX - 1, indexY - 1)) {
            // check adjacent tiles to the west and south
            // this is done to reduce the possible index values to 48 in total
            if (this.isArable(indexX, indexY - 1) && this.isArable(indexX - 1, indexY)) {
              bitmask[7] = 1;
            }
          }
          if (this.isArable(indexX, indexY - 1)) {
            bitmask[6] = 1;
          }
          if (this.isArable(indexX + 1, indexY - 1)) {
            if (this.isArable(indexX, indexY - 1) && this.isArable(indexX + 1, indexY)) {
              bitmask[5] = 1;
            }
          }
          if (this.isArable(indexX - 1, indexY)) {
            bitmask[4] = 1;
          }
          if (this.isArable(indexX + 1, indexY)) {
            bitmask[3] = 1;
          }
          if (this.isArable(indexX - 1, indexY + 1)) {
            if (this.isArable(indexX, indexY + 1) && this.isArable(indexX - 1, indexY)) {
              bitmask[2] = 1;
            }
          }
          if (this.isArable(indexX, indexY + 1)) {
            bitmask[1] = 1;
          }
          if (this.isArable(indexX + 1, indexY + 1)) {
            if (this.isArable(indexX, indexY + 1) && this.isArable(indexX + 1, indexY)) {
              bitmask[0] = 1;
            }
          }
          // convert array to binary string and then to int
          tileIndex = this.autoTileDict[parseInt(bitmask.join(""), 2)];
        }

        this.mapLayers.layer0.putTileAt(tileIndex, indexX, indexY);
      }
    }
  }

  makeAcre(acreStartX, acreStartY, acreWidth, acreHeight) {
    // fail check
    if (!this.hasArableLand) {
      console.warn('Arable Land flag is not set for scene. Creation failed.');
      return;
    }

    for (let x = 0; x < acreWidth; x++) {
      for (let y = 0; y < acreHeight; y++) {
        let indexX = acreStartX + x;
        let indexY = acreStartY + y;

        let index = convertIndexTo1D(indexX, indexY, this.currentMap.width);
        this.createSoilPatch(index, indexX, indexY);
      }
    }
    this.rebuildArableLayer();
  }

  createSoilPatch(index, x, y) {
    this.arableMap[index] = new SoilPatch(this, x * this.registry.values.tileSize, y * this.registry.values.tileSize, index);
    return this.arableMap[index];
  }

  update(time, delta) {
    super.update(time, delta);
    this.updateLightcones();
  }
}

class VillageScene extends OverworldScene {
  create(config) {
    super.create(config);

    this.hasWeather = true;
    
    // physics callback for collectible items
    this.physics.add.overlap(this.player, this.collectibles, (player, collectible)=> {
      collectible.collect();
    }); 

    this.makeTilemap('village', 4, ['layer1', 'layer2'], ['layer3']);
    this.setupCamera();

    // day and night tint
    this.setupDaytimeOverlay();

    // light sources at night
    this.setupLightSources();
  }

  update(time, delta) {
    super.update(time, delta);
    this.updateLightcones();
  }
}