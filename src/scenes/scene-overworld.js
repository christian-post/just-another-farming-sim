import { Player, NPC, Animal, Vendor, Trough } from '../sprites.js';
import { WeatherDisplayManager } from './scene-weather.js';

import { 
  DialogueTrigger, 
  TeleportTrigger, 
  SoilPatch, 
  InteractTrigger, 
  TeleportInteractTrigger 
} from '../game-objects.js';

import * as Utils from '../utils.js';


export class OverworldScene extends Phaser.Scene {
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
    this.allSprites.runChildUpdate = true;

    // objects that trigger an event (dialogue etc)
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

    this.manager.inputHandler.configureKeys(this);
    this.manager.inputHandler.checkForGamepad(this);

    // weather manager object
    this.WeatherDisplayManager = new WeatherDisplayManager(this);
    this.hasWeather = false;


    // #### visual overlays for debugging  ######################################

    this.events.on('create', ()=> {
      // grid that matches the tiles
      let grid = this.add.grid(
        0, 0, this.mapLayers.layer0.width, this.mapLayers.layer0.height, 
        this.registry.values.tileSize, this.registry.values.tileSize, null, null, 0x333333, 0.20
      )
        .setOrigin(0)
        .setDepth(1)
        .setVisible(this.registry.values.debug);

      // tilemap layer collision boundaries
      this.debugGfx = [];
      this.collisionLayers.forEach(layer => {
        let gfx = Utils.Debug.debugDraw(this.mapLayers[layer], this, this.registry.values.debug)
          .setDepth(9);
        this.debugGfx.push(gfx);
      });

      // physics hitboxes
      let physicsDebugGfx = null;

      this.registry.events.on('changedata-debug', (_, value) => {
        // what happens when the debug flag changes
        this.debugGfx.forEach(gfx => {
          gfx.setVisible(value);
        });
        grid.setVisible(value);

        this.physics.world.drawDebug = value;
        if (value) {
          physicsDebugGfx = this.physics.world.createDebugGraphic();
        } else {
          if (physicsDebugGfx) { physicsDebugGfx.destroy(); }
        }
      });
    });
  }

  makeTilemap(mapKey, collisionLayers, layersDrawnAbove) {
    /* 
    mapKey: string -> tilemap key
    numLayers: int -> number of tile layers in Tilemap data
    collisionLayers: Array -> Layers that have collision info set (layer0, layer1 etc)
    layersDrawnAbove: Array -> Layers that are drawn on top of the sprites
    */

    this.collisionLayers = collisionLayers;

    this.currentMap = this.make.tilemap({ key: mapKey });
    this.currentTileset = this.currentMap.addTilesetImage(this.registry.values.tilemapImages[mapKey]);

    this.currentMapKey = mapKey;

    // create map layers
    for (var i = 0; i < this.currentMap.layers.length; i++) {
      this.mapLayers[`layer${i}`] = this.currentMap.createLayer(`layer${i}`, this.currentTileset);
    }

    // create collision
    this.collisionLayers.forEach(layer => {
      this.mapLayers[layer].setCollisionByProperty({ 'collides': true });
      this.physics.add.collider(this.player, this.mapLayers[layer]);
    });

    // draw the layers above the sprites
    layersDrawnAbove.forEach(layer => {
      if (layer in this.mapLayers) {
        this.mapLayers[layer].setDepth(this.depthValues.mapAboveSprites);
      } else {
        console.warn(`${layer} not in map "${mapKey}".`);
      }
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
        let trigger = new DialogueTrigger(
          this, object.x, object.y, object.width, object.height, object.dialogueKey, options, optionsAreCallbacks
        );

        if ('interactionText' in object) {
          trigger.interactionButtonText = object.interactionText;
        }

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
        let acceptedItemTypes = JSON.parse(object.acceptedItemTypes);

        new Vendor(this, object.x, object.y, object.texture, items, acceptedItemTypes);
        break;

      case 'teleport':
        if ('interact' in object && object.interact) {
          // player has to press the interact button to teleport
          new TeleportInteractTrigger(this, object.x, object.y, object.width, object.height, object.target, object.targetX, object.targetY)
        } else {
          // player just runs into it to teleport
          new TeleportTrigger(this, object.x, object.y, object.width, object.height, object.target, object.targetX, object.targetY);
        }
        break;

      case 'interact':
        let args = null;
        if ('callbackArgs' in object) {
          args = JSON.parse(object.callbackArgs)
        }
        new InteractTrigger(this, object.x, object.y, object.width, object.height, object.callbackKey, args, object.interactionText);
        break;

      case 'trough':
        new Trough(this, object.x, object.y, object.properties);
        break;

      default:
        console.log(`No object for ${object.type}, ${object}`);
    }
  }

  addPathfinding() {
    // adds the Easystar pathfinding to this overworld scene
    this.pathfinder = new EasyStar.js();   // TODO module import
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

  setupCamera(follow=true) {
    this.cameras.main.setBounds(0, 0, this.mapLayers.layer0.width, this.mapLayers.layer0.height);
    this.cameras.main.startFollow(this.player, true);
    if (!follow) {
      this.cameras.main.on('followupdate', ()=> {
        this.cameras.main.stopFollow();
      });
    }
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

    this.textureOverlay.beginDraw();

    // batch draw calls to enhance performance
    this.textureOverlay.batchDraw(this.playerLightcone, this.player.x, this.player.y);
    this.lightcones.getChildren().forEach(child => {
      this.textureOverlay.batchDraw(child, child.x, child.y);
    });

    this.textureOverlay.endDraw();
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
      this.WeatherDisplayManager.update(delta);
    }
  }
}


export class FarmScene extends OverworldScene {
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

    this.makeTilemap('farm', ['layer1', 'layer2'], ['layer3', 'layer4']);
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
    let patch = this.arableMap[Utils.Math.convertIndexTo1D(x, y, this.currentMap.width)];
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

        let index = Utils.Math.convertIndexTo1D(indexX, indexY, this.currentMap.width);
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

export class VillageScene extends OverworldScene {
  create(config) {
    super.create(config);

    this.hasWeather = true;
    this.isNight = false;  // flag to change the tileset once
    
    // physics callback for collectible items
    this.physics.add.overlap(this.player, this.collectibles, (player, collectible)=> {
      collectible.collect();
    }); 

    this.makeTilemap('village', ['layer1', 'layer2'], ['layer3', 'layer4']);
    this.setupCamera();

    // day and night tint
    this.setupDaytimeOverlay();

    // light sources at night
    this.setupLightSources();
  }

  update(time, delta) {
    super.update(time, delta);
    this.updateLightcones();

    // change tileset at night
    if (this.manager.isNight && !this.isNight) {
      this.isNight = true;

      this.currentTileset.setImage(this.textures.get('villageNight'));

    } else if (!this.manager.isNight && this.isNight) {
      this.isNight = false;

      this.currentTileset.setImage(this.textures.get('village'));

    }
  }
}


export class BarnInteriorScene extends OverworldScene {
  create(config) {
    super.create(config);

    this.animals = this.add.group();  // Sprites

    this.hasWeather = false;
    
    // physics callback for collectible items
    this.physics.add.overlap(this.player, this.collectibles, (player, collectible)=> {
      collectible.collect();
    }); 

    this.makeTilemap('barns', ['layer0', 'layer1', 'layer2'], ['layer3', 'layer4']);
    this.setupCamera();

    // add animals that are already in the farmData
    for (const [type, data] of Object.entries(this.manager.farmData.data.livestock)) {
      // loop over types of livestock (pig, cow, etc)
      for (const [id, animal] of Object.entries(data)) {
        this.addAnimal(type, animal);
      }
    }

    // add an animal sprite once an animal is added to the data manager
    this.manager.events.on('farmDataAdd', (type, animal) => {
      // console.log('animal added: ', animal)
      this.addAnimal(type, animal);
    });

    // add an event that removes the animal when the data changes
    this.manager.events.on('farmDataRemove', (_, data) => {
      this.animals.getChildren().forEach(animal => {
        if (animal.getData('id') === data.id) {
          console.log('animal', animal.getData('id'), 'removed')
          animal.destroy();
        }
      });
    });

    // update existing animals when a day has passed
    this.manager.events.on('newDay', ()=> {
      this.animals.getChildren().forEach(animal => {
        let name = animal.data.get('name');
        let id = animal.data.get('id');
        // animal ages
        animal.data.inc('age', 1);
        this.manager.farmData.updateAnimal(name, id, 'age', animal.data.get('age'));

        // TODO animal eats and drinks

        // check if there is enough feed in the barn
        let buildingID = animal.data.get('building');
        let fed = false;

        let troughs = this.manager.farmData.data.buildings[buildingID].troughs;

        for (let i = 0; i < troughs.length; i++) {
          if (troughs[i].currentFill >= animal.data.get('feedIntake')) {
            // there is feed here, so animal eats
            fed = true;
            troughs[i].currentFill -= animal.data.get('feedIntake');

            // tell the Trough sprite that the fill has changed
            this.manager.events.emit('troughFillChange', troughs[i].currentFill, buildingID, i);

            break;
          }
        }

        if (fed) {
          // animal gets heavier
          if (animal.data.get('weight') < animal.data.get('maxWeight')) {
            // add ADG to weight, until it reaches max weight
            animal.data.set(
              'weight', 
              Math.min(animal.data.get('maxWeight'), animal.data.get('weight') + animal.data.get('averageDailyGain'))
            );
            this.manager.farmData.updateAnimal(name, id, 'weight', animal.data.get('weight'));
          }
        } else {
          // the animal has no food, gets sick and dies :(
          // TODO
          console.log(`The ${name} has no food!`);
        }
      });
    });
  }

  addAnimal(type, animalData) {
    // TODO:
    // animal child class from NPC
    // temporary solution
    // check if there is space left
    // check for collisions when adding

    // let animal = new NPC(
    //   this, 
    //   Phaser.Math.Between(32, 239),
    //   Phaser.Math.Between(1360, 1536),
    //   type
    // );
    let animal = new Animal(
      this, 
      Phaser.Math.Between(32, 239),
      Phaser.Math.Between(1360, 1536),
      animalData
    )
    
    // // store data references in the sprite (like id, etc)
    // // TODO might be only a temporary solution, depending on the data
    // for (let [key, value] of Object.entries(animalData)) {
    //   animal.setData(key, value);
    // }

    // animal.setDialogue('animals.age');  // TODO: for testing 
    // animal.setBehaviour('randomWalk');
    // animal.body.pushable = true;
    // animal.changeHitbox(12, 8, animal.width / 2 - 6, animal.height - 8);

    this.animals.add(animal);
  }

  update(time, delta) {
    super.update(time, delta);
  }
}


export class HouseInteriorScene extends OverworldScene {
  create(config) {
    super.create(config);

    this.hasWeather = false;
    
    // physics callback for collectible items
    this.physics.add.overlap(this.player, this.collectibles, (player, collectible)=> {
      collectible.collect();
    }); 

    this.makeTilemap('houses', ['layer0', 'layer1', 'layer2'], ['layer3', 'layer4']);
    this.setupCamera(false);
  }

  update(time, delta) {
    super.update(time, delta);
  }
}