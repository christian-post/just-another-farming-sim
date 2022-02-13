class TestScene extends Phaser.Scene {
  // Overworld scene for testing
  create() {
    // reference to the game manager scene
    this.manager = this.scene.get('GameManager');

    this.depthValues = {
      sprites: 2,
      mapAboveSprites: 3,
      daytimeOverlay: 10
    }

    // Auto tiling representations (experimental)
    this.autoTileDict = {
      farm: {
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
      }
    };

    // creation of groups

    // the Sprite groups
    this.allSprites = this.add.group(); 

    // objects that trigger a dialogue
    this.interactables = this.add.group();

    // light objects that are used for bitmasks
    this.lightcones = this.add.group();

    // sprites that the player can collect
    this.collectibles = this.add.group();

    // Crops that the player can grow
    this.crops = this.add.group();
    this.crops.runChildUpdate = true;

    // non-player characters
    this.npcs = this.add.group();
    this.npcs.runChildUpdate = true;

    this.depthSortedSprites = this.add.layer();
    this.depthSortedSprites.setDepth(this.depthValues.sprites);

    this.player = null;

    // create the tilemap
    this.makeTilemap('farm');


    // map change event handler TODO: obsolete
    this.events.on('mapChange', data => {
      console.log(data)
      this.makeTilemap(data.target);
      this.player.setPosition(data.x, data.y);
    });


  
    // physics callback for collectible items
    this.physics.add.overlap(this.player, this.collectibles, (player, collectible)=> {
      collectible.collect();
    }); 


    // configure input
    this.buttonCallbacks = {
      inventory: ()=> {
        // pause the current overworld scene and show the Inventory
        this.scene.pause(this.scene.key);
        this.manager.toggleDaytimePause();
        this.scene.run('InventoryDisplay');
      },
      interact: () => {
        this.events.emit('player-interacts');
      },
      item1: () => {
        this.events.emit('itemUsed', 'item1');
      },
      item2: () => {
        this.events.emit('itemUsed', 'item2');
      }
    }

    this.manager.configureKeys(this);

    // Gamepad functionality
    this.manager.checkForGamepad(this);



    // start the Inventory Scene and User Interface
    this.scene.run('InventoryManager');

    // create arable land
    // TODO: make this a property of the Tiled map?
    // array to indicate where the crops can be planted
    this.arableMap = new Array(this.currentMap.width * this.currentMap.height).fill(null);

    // this.makeAcre(9, 15, 10, 4);
    // this.makeAcre(23, 18, 10, 16);



    // effects (testing)

    // TODO: testing stuff
    // a layer that changes the tint of the game world
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

    // render Texture for light sources at night

    this.textureOverlay = this.add.renderTexture(
      0, 0, this.mapLayers.layer0.width, this.mapLayers.layer0.height
    )
      .setDepth(this.depthValues.daytimeOverlay)   // TODO is this needed? (daytime overlay depth is already set)
      .setVisible(false);

    this.playerLightcone = this.add.image(0, 0, 'lightcone').setVisible(false);

    let mask = this.daytimeOverlay.createBitmapMask(this.textureOverlay);
    mask.invertAlpha = true;
    this.daytimeOverlay.setMask(mask);

    // // play the background music
    // this.backgroundMusic = this.sound.add(
    //   'overworld', 
    //   { 
    //     loop: true,
    //     volume: this.registry.values.globalMusicVolume
    //   }
    // ).play();


    // add items for testing
    // TODO make specific item classes with functionality

    // fire an equipped event
    // TODO: only for the demo

    // let itemData = this.cache.json.get('itemData');

    // // add items to inventory
    // let inventoryManager = this.scene.get('InventoryManager');

    // inventoryManager.events.on('create', ()=> {
    //   inventoryManager.addItem(itemData.tools.scytheL1);
    //   inventoryManager.addItem(itemData.tools.wateringCan);
    //   // inventoryManager.addItem(itemData.tools.hoeL1);
    //   // inventoryManager.equipItem(1, 'item1');  // TODO: auto-equip if equip slot is empty
    //   inventoryManager.addItem(itemData.seeds.wheat, 20);
    //   inventoryManager.addItem(itemData.tools.fertilizer, 10);
    //   inventoryManager.addItem(itemData.tools.sodaStamina, 10);
    // });


    // TESTING

    
    
    // let tile = this.registry.values.tileSize;

    // // add a vendor

    // new Vendor(
    //   this, 28 * tile, 12 * tile, 'npc-woman-1', 
    //   [
    //     'seeds.wheat', 
    //     'seeds.potato', 
    //     'seeds.maize', 
    //     'seeds.sugarbeet',
    //     'tools.fertilizer', 
    //     'tools.scytheL1', 
    //     'tools.scytheL2', 
    //     'tools.scytheL3', 
    //     'tools.hoeL1',
    //     'tools.hoeL2',
    //     'tools.hoeL3',
    //     'tools.wateringCan',
    //     'tools.sodaStamina'
    //   ]
    // );


    // let npc = new NPC(this, 10 * tile, 10 * tile, 'npc-man-1');

    // npc.addDialogueWithOptions('test.test-1', [
    //   ()=> { npc.talk('test.test-one'); },
    //   ()=> { npc.talk('test.test-two'); },
    //   ()=> { npc.talk('test.test-three'); },
    // ]);


    // // add a bunch of NPCs
    // let numNPCs = 0;

    // if (numNPCs > 0) {
    //   // store collisions in array
    //   let freeTiles = [];
    //   for (let x = 0; x < this.currentMap.width; x++) {
    //     for (let y = 0; y < this.currentMap.height; y++) {
    //       let tile = this.mapLayers.layer1.getTileAt(x, y);
    //       if (!tile || !tile.canCollide) {
    //         freeTiles.push(convertIndexTo1D(x, y, this.currentMap.width));
    //       }
    //     }
    //   }

    //   for (let i = 0; i < numNPCs; i++) {
    //     // get a random free tile
    //     let [randomIndex] = freeTiles.splice(Phaser.Math.Between(0, freeTiles.length), 1);
    //     let pos = convertIndexTo2D(randomIndex, this.currentMap.width);

    //     // create an NPC
    //     new NPC(this, pos.x * tile, pos.y * tile, Math.random() < 0.5 ? 'npc-woman-1': 'npc-man-1');
    //   }
    // }
    
    // debugging
    if (DEBUG) {
      this.add.grid(
        0, 0, this.mapLayers.layer1.width, this.mapLayers.layer1.height, 
        this.registry.values.tileSize, this.registry.values.tileSize, null, null, 0x333333, 0.25
        ).setOrigin(0);

      debugDraw(this.mapLayers.layer2, this);
      debugDraw(this.mapLayers.layer1, this);
    }

    // rects for debugging to show arable land
    // TODO use this as an overlay in the actual game
    if (DEBUG) {
      this.arableMap.forEach((value, index) => {
        if (value === 1) {
          let pos = convertIndexTo2D(index, map.width);
          let rect = this.add.rectangle(pos.x * 16, pos.y * 16, 16, 16, 0xff0000, 0.3);
          rect.setOrigin(0);
          rect.setStrokeStyle(1, 0xff0000, 0.5);
        }
      });
    }
  }


  makeTilemap(mapKey) {
    if (this.currentMap) {
      this.currentMap.removeAllLayers();
      this.mapLayers = {};

      // remove colliders from previous map
      this.physics.world.colliders.getActive().forEach(collider => {
        this.physics.world.removeCollider(collider);
      });

      // destroy all map objects
      // TODO
      this.allSprites.clear(true, true);
      
    }

    this.currentMap = this.make.tilemap({ key: mapKey });
    const tileset = this.currentMap.addTilesetImage(this.registry.values.tilemapImages[mapKey]);

    this.currentMapKey = mapKey;

    // map layers
    this.mapLayers = {
      layer0: this.currentMap.createLayer('layer0', tileset),  // ground layer
      layer1: this.currentMap.createLayer('layer1', tileset),
      layer2: this.currentMap.createLayer('layer2', tileset),
      layer3: this.currentMap.createLayer('layer3', tileset)
    };

    this.mapLayers.layer1.setCollisionByProperty({ 'collides': true });
    this.mapLayers.layer2.setCollisionByProperty({ 'collides': true });
    // draw the topmost layer above the sprites
    this.mapLayers.layer3.setDepth(this.depthValues.mapAboveSprites);

    this.physics.world.setBounds(0, 0, this.mapLayers.layer1.width, this.mapLayers.layer1.height);

    // create the Player sprite if it doesn't exist
    if (!this.player) {
      this.player = new Player(this, 256, 208);
      this.depthSortedSprites.add(this.player);
    } 

    // TODO: rebuild collision
    // TODO: change to spawn object for player and NPCs
    let spawnPositions = {}

    // create map objects that trigger collision events with the interact rect
    let rawObjects = this.currentMap.getObjectLayer('objects').objects;

    // TODO: include in makeTilemap()
    rawObjects.forEach( elem => {
      // convert properties array to object
      let properties = {}
      elem.properties.forEach( p => {
        properties[p.name] = p.value;
      });

      // check elem.type and create an object accordingly
      switch (elem.type) {
        case 'dialogue':
          let options = properties.hasOptions ? JSON.parse(properties.options) : null;
          let optionsAreCallbacks = properties.optionsAreCallbacks ? true : false;
          new DialogueTrigger(
            this, elem.x, elem.y, elem.width, elem.height, properties.dialogueKey, options, optionsAreCallbacks
          );
          break;
        case 'light':
          let x = elem.x + elem.width / 2;
          let y = elem.y + elem.height;
          let lightcone = this.add.image(x, y, properties.texture).setVisible(false);
          this.lightcones.add(lightcone);
          break;
        case 'spawn':
          spawnPositions[elem.name] = { 
            x: elem.x,
            y: elem.y
          };
          break;
        case 'teleport':
          new TeleportTrigger(this, elem.x, elem.y, elem.width, elem.height, properties.target, properties.x, properties.y);
          break;
        default:
          console.log(`No object for ${elem.type}, ${elem}`);
      }
    });
    
    // TODO instead loop through layers and check for collision attribute
    this.physics.add.collider(this.player, this.mapLayers.layer1);
    this.physics.add.collider(this.player, this.mapLayers.layer2);

    // setup the camera
    this.cameras.main.setBounds(0, 0, this.mapLayers.layer0.width, this.mapLayers.layer0.height);
    this.cameras.main.startFollow(this.player, true);
  }


  drawLightcones() {
    this.textureOverlay.clear();
    this.textureOverlay.draw(this.playerLightcone, this.player.x, this.player.y);

    this.lightcones.getChildren().forEach(child => {
      this.textureOverlay.draw(child, child.x, child.y);
    });
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
          if (this.currentMapKey in this.autoTileDict) {
            tileIndex = this.autoTileDict[this.currentMapKey].grass;
          } else {
            // pass
          }
          
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
          tileIndex = this.autoTileDict[this.currentMapKey][parseInt(bitmask.join(""), 2)];
        }

        this.mapLayers.layer0.putTileAt(tileIndex, indexX, indexY);
      }
    }
  }


  makeAcre(acreStartX, acreStartY, acreWidth, acreHeight) {
    for (let x = 0; x < acreWidth; x++) {
      for (let y = 0; y < acreHeight; y++) {
        let indexX = acreStartX + x;
        let indexY = acreStartY + y;

        let index = convertIndexTo1D(indexX, indexY, this.currentMap.width);
        this.arableMap[index] = new SoilPatch(this, indexX * this.registry.values.tileSize, indexY * this.registry.values.tileSize, index);

        this.rebuildArableLayer();
      }
    }
  }


  update(time, delta) {
    this.player.update(delta);

    // depth sort of sprites
    let sprites = this.depthSortedSprites.getChildren();
    sprites.forEach(sprite => {
      if (sprite.hasOwnProperty('depthSortY')) {
        sprite.setDepth(sprite.depthSortY);
      } else {
        sprite.setDepth(sprite.y);
      }
    });

    // update the light cone to the player's position
    if (this.manager.isNight) {
      this.playerLightcone.setPosition(this.player.x, this.player.y);
      this.drawLightcones();
    } else {
      // TODO: check this only once when it is becoming day
      this.textureOverlay.clear();
    }
  }
}


