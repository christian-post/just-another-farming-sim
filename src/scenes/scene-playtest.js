class TestScene extends Phaser.Scene {
  // Overworld scene for testing
  create() {
    // reference to the game manager scene
    this.manager = this.scene.get('GameManager');

    // load the tilemap
    const map = this.make.tilemap({ key: 'farm' });
    const tileset = map.addTilesetImage('overworld');

    this.currentMap = map;

    this.depthValues = {
      sprites: 2,
      mapAboveSprites: 3,
      daytimeOverlay: 10
    }

    // map layers
    // TODO make this process more modular?
    this.mapLayers = {
      layer0: map.createLayer('layer0', tileset),
      layer1: map.createLayer('layer1', tileset),
      layer2: map.createLayer('layer2', tileset),
      layer3: map.createLayer('layer3', tileset)
    };

    this.mapLayers.layer1.setCollisionByProperty({ 'collides': true });
    this.mapLayers.layer2.setCollisionByProperty({ 'collides': true });
    // draw the topmost layer above the sprites
    this.mapLayers.layer3.setDepth(this.depthValues.mapAboveSprites);

    this.physics.world.setBounds(0, 0, this.mapLayers.layer1.width, this.mapLayers.layer1.height);


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


    // create map objects that trigger collision events with the interact rect
    let rawObjects = map.getObjectLayer('objects').objects;

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

    // object to store map information about positions
    // TODO: change to spawn object for player and NPCs
    let spawnPositions = {}
    
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
        default:
          console.log(`No object for ${elem.type}, ${elem}`);
      }
    });

    // create the Player sprite
    this.player = new Player(this, spawnPositions.playerStartPosition.x, spawnPositions.playerStartPosition.y);
    // this.player = new Player(this, this.registry.values.tileSize * 16, this.registry.values.tileSize * 12);
    // this.player.setDepth(2);
    this.physics.add.collider(this.player, this.mapLayers.layer1);
    this.physics.add.collider(this.player, this.mapLayers.layer2);
    this.depthSortedSprites.add(this.player);

    // physics callback for collectible items
    this.physics.add.overlap(this.player, this.collectibles, (player, collectible)=> {
      collectible.collect();
    }); 

    // setup the camera
    this.cameras.main.setBounds(0, 0, this.mapLayers.layer0.width, this.mapLayers.layer0.height);
    this.cameras.main.startFollow(this.player, true);


    // configure input
    this.buttonCallbacks = {
      inventory: ()=> {
        // pause the current overworld scene and show the Inventory
        this.scene.pause(this.scene.key);
        this.manager.toggleDaytimePause();
        this.scene.run('InventoryDisplay', this.scene.key);
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
    this.arableMap = new Array(map.width * map.height).fill(0);

    this.makeAcre(9, 15, 10, 4);
    this.makeAcre(23, 18, 10, 16);

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

    // play the background music
    this.backgroundMusic = this.sound.add('overworld', { loop: true });
    this.backgroundMusic.play();



    // add items for testing
    // TODO make specific item classes with functionality

    // fire an equipped event
    // TODO: only for the demo

    let itemData = this.cache.json.get('itemData');

    // add items to inventory
    let inventoryManager = this.scene.get('InventoryManager');

    inventoryManager.events.on('create', ()=> {
      inventoryManager.addItem(itemData.tools.scytheL1);
      // inventoryManager.equipItem(0, 'item1');  // TODO: auto-equip if equip slot is empty
      inventoryManager.addItem(itemData.seeds.wheat, 20);
      // inventoryManager.addItem(itemData.seeds.sugarbeet, 20);
    });


    // TESTING
    
    let tile = this.registry.values.tileSize;

    // add a vendor

    new Vendor(
      this, 28 * tile, 12 * tile, 'npc-woman-1', 
      [
        'seeds.wheat', 
        'seeds.potato', 
        'seeds.maize', 
        'seeds.sugarbeet', 
        'tools.scytheL1', 
        'tools.scytheL2', 
        'tools.sodaStamina', 
        'tools.fertilizer' 
      ]
    );


    let npc = new NPC(this, 10 * tile, 10 * tile, 'npc-man-1');

    npc.addDialogueWithOptions('test.test-1', [
      ()=> { npc.talk('test.test-one'); },
      ()=> { npc.talk('test.test-two'); },
      ()=> { npc.talk('test.test-three'); },
    ]);


    // add a bunch of NPCs
    let numNPCs = 0;

    if (numNPCs > 0) {
      // store collisions in array
      let freeTiles = [];
      for (let x = 0; x < this.currentMap.width; x++) {
        for (let y = 0; y < this.currentMap.height; y++) {
          let tile = this.mapLayers.layer1.getTileAt(x, y);
          if (!tile || !tile.canCollide) {
            freeTiles.push(convertIndexTo1D(x, y, this.currentMap.width));
          }
        }
      }

      for (let i = 0; i < numNPCs; i++) {
        // get a random free tile
        let [randomIndex] = freeTiles.splice(Phaser.Math.Between(0, freeTiles.length), 1);
        let pos = convertIndexTo2D(randomIndex, this.currentMap.width);

        // create an NPC
        new NPC(this, pos.x * tile, pos.y * tile, Math.random() < 0.5 ? 'npc-woman-1': 'npc-man-1');
      }
    }
    
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

  drawLightcones() {
    this.textureOverlay.clear();
    this.textureOverlay.draw(this.playerLightcone, this.player.x, this.player.y);

    this.lightcones.getChildren().forEach(child => {
      this.textureOverlay.draw(child, child.x, child.y);
    });

  }

  makeAcre(acreStartX, acreStartY, acreWidth, acreHeight) {
    for (let x = 0; x < acreWidth; x++) {
      for (let y = 0; y < acreHeight; y++) {
        let indexX = acreStartX + x;
        let indexY = acreStartY + y;

        this.arableMap[convertIndexTo1D(indexX, indexY, this.currentMap.width)] = 1;
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


