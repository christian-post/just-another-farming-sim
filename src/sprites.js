class BaseCharacterSprite extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, key) {
    super(scene, x, y, key);
    this.scene.physics.add.existing(this);
    this.scene.add.existing(this);
    this.scene.allSprites.add(this);

    this.key = key;

    // reference persistent scenes
    this.manager = this.scene.scene.get('GameManager');

    // hitbox
    // TODO: more modular?
    this.setBodySize(16, 12, false);
    this.body.setOffset(5, this.height - this.body.height);
    this.debugShowBody = true;

    // Animations
    this.animsFrateRate = 8;
    this.animsDuration = 300;  // frame duration in milliseconds
    this.lastDir = 'down';  // last facing direction

    // Physics
    this.speed = 80;

    // make a shadow
    this.shadow = this.scene.add.image(this.x, this.getBounds().bottom, 'player-shadow')
      .setAlpha(0.3)
      .setDepth(this.scene.depthValues.sprites - 1);
    this.scene.events.on('prerender', ()=> {
      this.shadow.setPosition(this.x, this.getBounds().bottom);
    });
  }

  createAnimations(animations) {
    animations.forEach(data => {
      this.anims.create({
        key: `${this.key}-${data.key}`,
        frames: data.frames,
        frameRate: this.animsFrateRate,
        duration: this.animsDuration,
        repeat: data.repeat || 0
      });
    });

    // play the first animation as default
    this.anims.play(`${this.key}-${animations[0].key}`);
  }

  move(direction) {
    direction.setLength(this.speed);
    this.setVelocity(direction.x, direction.y);

    // adjust the player's animation based on the velocity vector
    if (direction.lengthSq() === 0) {
      this.anims.play(`${this.key}-idle-${this.lastDir}`, true);
    } else {
      if (Math.abs(direction.x) > Math.abs(direction.y)) {
        // horizontal component of the velocity vector is bigger
        if (direction.x > 0) {
          this.lastDir = 'right';
        } else if (direction.x < 0) {
          this.lastDir = 'left';
        }
      } else {
        // vertical component is bigger
        if (direction.y > 0) {
          this.lastDir = 'down';
        } else if (direction.y < 0) {
          this.lastDir = 'up';
        }
      }
      this.anims.play(`${this.key}-walk-${this.lastDir}`, true);
    }
  }
}



class Player extends BaseCharacterSprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');

    this.inventory = this.scene.scene.get('InventoryManager');  // scene reference

    this.createAnimations([
      { key: 'idle-down', frames: [{key: this.key, frame: 1}] },
      { key: 'idle-up', frames: [{key: this.key, frame: 10}] },
      { key: 'idle-right', frames: [{key: this.key, frame: 7}] },
      { key: 'idle-left', frames: [{key: this.key, frame: 4}] },
      { key: 'walk-down', frames: this.anims.generateFrameNumbers(this.key, {frames: [0, 1, 2, 1]}) },
      { key: 'walk-up', frames: this.anims.generateFrameNumbers(this.key, {frames: [9, 10, 11, 10]}) },
      { key: 'walk-right', frames: this.anims.generateFrameNumbers(this.key, {frames: [6, 7, 8, 7]}) },
      { key: 'walk-left', frames: this.anims.generateFrameNumbers(this.key, {frames: [3, 4, 5, 4]}) },
    ]);

    // create an object that lets the player interact with other objects
    this.interactionRect = scene.add.rectangle(
      x, 
      y + this.scene.registry.values.tileSize, 
      this.scene.registry.values.tileSize, 
      this.scene.registry.values.tileSize
    )
      .setOrigin(0.5)
      .setFillStyle()
      .setStrokeStyle(2, 0xDD0000, 0.3)
      .setVisible(false)   // only visible under certain conditions
      .setDepth(this.scene.depthValues.sprites);

    this.scene.physics.add.existing(this.interactionRect);

    // ##  Controls  ##

    // interaction button event
    this.manager.events.on('player-interacts', this.interactButton, this);

    // Item usage event
    this.manager.events.on('itemUsed', button => {
      this.itemUseButton(button);
    });

    // cooldown flag for seed usage (TODO: make an object if more flags are needed)
    this.isSowing = false;

    // resources
    this.maxStamina = this.manager.registry.values.startingMaxStamina;
    this.stamina = this.maxStamina;

    // the tool that is currently being used
    this.tool = null; 

    // stamina refill
    this.manager.events.on('refillStamina', amount => {
      this.changeStamina(amount);
    });

  }

  update(time, delta) {
    // check if a tool is being used
    // if so, the player can't move for that period
    if (this.tool) {
      this.tool.update(delta);
      this.setVelocity(0);
      // TODO: tool usage animation
      this.anims.play('player-idle-' + this.lastDir, true);
    } else if (this.isSowing) {
      this.setVelocity(0);
      // TODO: sowing animation
      this.anims.play('player-idle-' + this.lastDir, true);
    } else {
      let dir = getCursorDirections(this.scene, 0, delta);
      this.move(dir);
    }

    // create a ray that is cast in front of the player based on the last direction
    let ray = new Phaser.Math.Vector2(this.x, this.y + this.width * 0.5);

    switch (this.lastDir) {
      case 'right': 
        ray.x += this.width;
        break;
      case 'left': 
        ray.x -= this.width;
        break;
      case 'down': 
        ray.y += this.height * 0.5;
        break;
      case 'up': 
        ray.y -= this.height;
        break;
    }

    // snap rectangle to grid
    ray.x = parseInt(ray.x / this.scene.registry.values.tileSize) * this.scene.registry.values.tileSize;
    ray.y = parseInt(ray.y / this.scene.registry.values.tileSize) * this.scene.registry.values.tileSize;

    this.interactionRect.x = ray.x + this.scene.registry.values.tileSize * 0.5;
    this.interactionRect.y = ray.y + this.scene.registry.values.tileSize * 0.5;

    // TODO: this is checked twice when a button is pressed
    let interactX = parseInt(this.interactionRect.x / this.scene.registry.values.tileSize);
    let interactY = parseInt(this.interactionRect.y / this.scene.registry.values.tileSize);
    let index = convertIndexTo1D(interactX, interactY, this.scene.currentMap.width);

    // check for arable Land
    if (this.scene.hasArableLand) {
      if (this.scene.arableMap[index]) {
        if (!this.interactionRect.visible) { this.interactionRect.setVisible(true) };
      } else {
        if (this.inventory.isEquipped('hoe')) {
          // if hoe is equipped, rect is visible outside of arable land
          if (!this.interactionRect.visible) { this.interactionRect.setVisible(true) };
        } else {
          if (this.interactionRect.visible) { this.interactionRect.setVisible(false) };
        }
      }
    }

    // check if rectangle is colliding with any interactable sprites
    let collisions = checkCollisionGroup(this.interactionRect, this.scene.allSprites.getChildren());
    if (collisions.length > 0 && collisions[0] != this) {
      let string = collisions[0].interactionButtonText || 'error';
      this.manager.events.emit('changeTextInteract', string);
    } else {
      this.manager.events.emit('changeTextInteract', '');
    }
  }

  interactButton() {
    let interactX = parseInt(this.interactionRect.x / this.scene.registry.values.tileSize);
    let interactY = parseInt(this.interactionRect.y / this.scene.registry.values.tileSize);

    if (DEBUG) {
      console.log(interactX, interactY);
    }

    let collisions = checkCollisionGroup(this.interactionRect, this.scene.allSprites.getChildren());

    // check for interactible if any collisions happen
    if (collisions.length > 0) {
      for (let col of collisions) {
        if (col['interact']) {
          col.interact(this);
          break;
        }
      }
    }
  }

  itemUseButton(button) {
    // TODO: check interaction rect only if the item requires it
    let interactX = parseInt(this.interactionRect.x / this.scene.registry.values.tileSize);
    let interactY = parseInt(this.interactionRect.y / this.scene.registry.values.tileSize);

    if (DEBUG) {
      console.log(interactX, interactY);
    }

    let item = this.scene.scene.get('InventoryManager').getSelectedItem(button);
    let collisions = [];

    if (item) {
      // check the item type
      switch (item.type) {
        case 'seed':
          collisions = checkCollisionGroup(this.interactionRect, this.scene.crops.getChildren());

          if (collisions.length === 0) {
            let index = convertIndexTo1D(interactX, interactY, this.scene.currentMap.width);
            if (this.scene.arableMap[index]) {
              if (this.checkExhausted(item)) { return; }
              // plant something
              // get crop type from inventory
      
              if (item && item.quantity > 0) {
                // TODO: check if it is actually a crop, maybe use the callback of the item
                let cropX = this.scene.registry.values.tileSize * interactX;
                let cropY = this.scene.registry.values.tileSize * interactY;

                this.scene.arableMap[index].plantCrop(this.scene, this.scene.crops, cropX, cropY, item.name, index);
      
                this.inventory.events.emit('itemConsumed', item, button);              

                // reduce the player's stamina by a bit
                this.changeStamina(-item.stamina);
                console.log(item.stamina)

                // set a timer as a cooldown
                // TODO: placeholder for sowing animation
                this.isSowing = true;
                this.scene.time.addEvent({
                    delay: 500, callback: ()=> {
                      this.isSowing = false;
                    }
                  });
              } else {
                console.log('nothing equipped');
              }
            }
          } 
          break;

        case 'tool':
          // collisions = checkCollisionGroup(this.interactionRect, this.scene.crops.getChildren());
          collisions = checkCollisionGroup(this.interactionRect, this.scene.allSprites.getChildren());
          if (collisions.length > 0) {
            // check for stamina only if there would be something to interact with
            if (this.checkExhausted(item)) { return; }
          }
          // use the tool
          this.createTool(
            item, { 
              collisions: collisions,
              button: button,
              mapIndex: convertIndexTo1D(interactX, interactY, this.scene.currentMap.width),
              x: interactX,
              y: interactY
          });

          break;

        default:
          console.warn(`behavior for item "${item.type}" not implemented`);
          showMessage(this.scene, 'general.item-no-action');
      }
    }
  }

  changeStamina(value) {
    this.stamina = Math.min(this.maxStamina, Math.max(this.stamina + value, 0));
    let percentage = (this.stamina / this.maxStamina) * 100;
    this.manager.events.emit('stamina-change', percentage);
  }

  createTool(item, config) {
    if (this.tool) {
      // if tool is currently in action, do nothing
      return;
    }

    switch(item.usageCallback) {
      // TODO: put in own js file?
      case 'scythe':
        this.tool = new Scythe(this.scene, this.x, this.y, item.frame);
        // check if collision object has a "harvest" method
        if (config.collisions.length > 0) {
          for (let col of config.collisions) {
            if (col['harvest']) {
              this.changeStamina(-item.stamina);
              col.harvest();
              break;
            }
          }
        }
        break;
      case 'hoe':
        if (this.checkExhausted(item)) { return; }

        this.tool = new Hoe(this.scene, this.x, this.y, item.frame);
        // TODO: make a property in Tiled where land can be dug over
        // TODO when hoe is selected, show interact rect everywhere

        // check if there is arable land
        if (!this.scene.arableMap[config.mapIndex]) {
          this.scene.makeAcre(config.x, config.y, 1, 1);
          this.changeStamina(-item.stamina);
        }
        
        break;

      case 'wateringCan':
        this.tool = new WateringCan(this.scene, this.x, this.y, item.frame);
        // check if there is a collision and can be watered
        if (config.collisions.length > 0) {
          for (let col of config.collisions) {
            if (col['water']) {
              if (col.waterLevel == this.scene.registry.values.maxWateringLevel) {
                showMessage(this.scene, 'general.maxWaterLevelReached')
              } else {
                this.changeStamina(-item.stamina);
                col.water(this.scene.registry.values.wateringCanAmount);
              }
              break;
            }
          }
        }
        break;
      case 'sodaStamina': 
        if (item.quantity > 0) {
          // check if stamina is full
          if (this.stamina >= this.maxStamina) {
            showMessage(this.scene, 'general.stamina-full');
          } else {
            this.changeStamina(this.maxStamina * item.refillStamina);
            this.inventory.events.emit('itemConsumed', item, config.button);
          }
        }
        
        break;
      case 'fertilizer':
        if (item.quantity > 0) {
          // look for collision with crop and raise its fertilization level
          if (config.collisions.length > 0) {
            for (let col of config.collisions) {
              if (col instanceof Crop) {
                if (col.fertilizedLevel < col.data.values.maxFertilizer) {
                  col.fertilizedLevel++;
                  this.inventory.events.emit('itemConsumed', item, config.button);
                  this.scene.arableMap[config.mapIndex].fertilize(1);
                } else {
                  showMessage(this.scene, 'interactibles.crops.enoughFertilizer');
                }
                break;
              }
            }
          }
        }
        break;
      default:
        console.warn('function for tool not implemented: ', item.name);
    }
  }

  checkExhausted(item) {
    // you can only use items if you have stamina left
    if (this.stamina < item.stamina) {
      showMessage(this.scene, 'general.stamina-low');
      return true;
    } else {
      return false;
    }
  }
}


class NPC extends BaseCharacterSprite {
  constructor(scene, x, y, key) {
    super(scene, x, y, key);

    this.scene.npcs.add(this);
    this.scene.depthSortedSprites.add(this);

    this.key = key;

    this.createAnimations([
      { key: 'idle-down', frames: [{key: this.key, frame: 1}] },
      { key: 'idle-up', frames: [{key: this.key, frame: 10}] },
      { key: 'idle-right', frames: [{key: this.key, frame: 7}] },
      { key: 'idle-left', frames: [{key: this.key, frame: 4}] },
      { key: 'walk-down', frames: this.anims.generateFrameNumbers(this.key, {frames: [0, 1, 2, 1]}), repeat: -1 },
      { key: 'walk-up', frames: this.anims.generateFrameNumbers(this.key, {frames: [9, 10, 11, 10]}), repeat: -1 },
      { key: 'walk-right', frames: this.anims.generateFrameNumbers(this.key, {frames: [6, 7, 8, 7]}), repeat: -1 },
      { key: 'walk-left', frames: this.anims.generateFrameNumbers(this.key, {frames: [3, 4, 5, 4]}), repeat: -1 },
    ]);

    this.body.pushable = true;
    this.speed = 50;

    this.scene.physics.add.collider(this, this.scene.player, (npc, player) => { 
      npc.stop(); 
      // face the player
      npc.face(player);
    });

    // collide with other npcs
    this.scene.physics.add.collider(this, this.scene.npcs, (npc, other) => { 
      npc.stop(); 
      other.stop();
    });

    // collision with walls etc
    this.scene.physics.add.collider(this, this.scene.mapLayers.layer1, (npc, wall) => { npc.stop(); });

    // pathfinding
    this.path = null;

    // interaction with player
    this.interactionButtonText = 'talk';

    this.dialogue = [];
    this.finalDialogue = {
      type: 'normal',
      key: ''
    };
  }

  update(time, delta) {
    if (this.path) {
      this.followPath();
    }
  }

  setBehaviour(type) {
    switch(type) {
      case 'randomWalk': 
      // walks in a random direction after some time, or stops
      // TODO: check for collisions beforehand!
        var timer = this.scene.time.addEvent({
          delay: Phaser.Math.Between(1000, 3000),
          loop: true,
          callback: ()=> {
            timer.delay = Phaser.Math.Between(1000, 3000);
            // flip a coin
            if (Math.random() < 0.5) {
              // choose one of four direction, or stop
              let choice = chooseWeighted([
                { x: 1, y: 0 },
                { x: 0, y: 1 },
                { x: -1, y: 0 },
                { x: 0, y: -1 },
                { x: 0, y: 0 }
              ], [1, 1, 1, 1, 5]);
              this.move(new Phaser.Math.Vector2(choice.x, choice.y));
            } else {
              // look in a random direction that the NPC is not already facing
              this.stop();
              let dirs = ['up', 'down', 'left', 'right'];
              this.lastDir = choose(dirs.filter(value => { return value !== this.lastDir; }));
            }
          }
        });
      break;

      case 'followEvent':
        // TODO: testing
        this.manager.events.on('path-test', ()=> {
          this.findPath(this.body, this.scene.player.body);
        });

        break;
    
      default:
        console.warn(`no behaviour defined for ${type}`);
    }
  }

  findPath(from, to) {
    if (!this.scene.pathfinder) {
      console.warn('Pathfinding plugin not initialised');
      return; 
    } else {

      // translate world coordinates to tile coordinates
      let tile = this.scene.registry.values.tileSize;
      let startTileX = Math.floor(from.x / tile);
      let startTileY = Math.floor(from.y / tile);
      let endTileX = Math.floor(to.x / tile);
      let endTileY = Math.floor(to.y / tile);

      this.scene.pathfinder.findPath(startTileX, startTileY, endTileX, endTileY, path => {
        if (path === null) {
          console.warn("Path was not found.");
        } else {
          // this.path = simplifyPath(path);
          this.path = path;

          if (DEBUG) {
            if (this.scene.hasOwnProperty('debugPath')) {
              this.scene.debugPath.destroy();
            }
            this.scene.debugPath = drawDebugPath(this.scene, path);
          }
        }
      });

      this.scene.pathfinder.calculate();
    }
  }

  followPath() {
    if (this.path.length === 0) {
      this.stop();
      return;
    }
    
    let target = this.path[0];

    let tile = this.scene.registry.values.tileSize;
    let targetX = target.x * tile;
    let targetY = target.y * tile;

    let dist = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);

    if (dist > 1) {
      // seek the target
      let vecToTarget = new Phaser.Math.Vector2(targetX, targetY).subtract(new Phaser.Math.Vector2(this.x, this.y));
      vecToTarget.normalize();

      this.move(vecToTarget);
    } else {
      this.path.shift();
    }
  }


  stop() {
    this.setVelocity(0);
    this.anims.play(`${this.key}-idle-${this.lastDir}`, true);
  }


  face(object) {
    let direction = '';

    // TODO calculate an angle instead?
    if (Math.abs(object.y - this.y) < 12) {
      if (object.x < this.x) {
        direction = 'left';
      } else {
        direction = 'right';
      }
    } else {
      if (object.y < this.y) {
        direction = 'up';
      } else {
        direction = 'down';
      }
    }
    this.lastDir = direction;
    this.stop();
  }

  interact(sprite) {
    this.face(sprite);

    let dialogue;
    if (this.dialogue.length > 0) {
      dialogue = this.dialogue.shift();
    } else {
      // fallback if nothing left
      dialogue = this.finalDialogue;
    }
    if (dialogue.type === 'normal') {
      showMessage(this.scene, 'npc-dialogue.' + dialogue.key);
    } else if (dialogue.type === 'options') {
      showMessage(
        this.scene, 'npc-dialogue.' + dialogue.key, 
        null, null, { key: 'npc-dialogue.' + dialogue.optionKey, callbacks: dialogue.callbacks }
      );
    }
  }

  setDialogue(stringOrArray) {
    if (typeof stringOrArray === 'string') {
      this.finalDialogue = {
        key: stringOrArray,
        type: 'normal'
      };
    } else {
      if (stringOrArray.length === 1) {
        this.finalDialogue = {
          key: [...stringOrArray][0],
          type: 'normal'
        };
      } else {
        this.finalDialogue = {
          key: stringOrArray.pop(),
          type: 'normal'
        };
      }

      stringOrArray.forEach(key => {
        this.dialogue.push({
          key: key,
          type: 'normal'
        });
      });
    }
  }

  addDialogueWithOptions(key, optionCallbacks, final=true) {
    let dg = {
      key: key + '.text',
      type: 'options',
      optionKey: key + '.options',
      callbacks : optionCallbacks
    };
    this.dialogue.push(dg);
    if (final) {
      this.finalDialogue = dg;
    }
  }

  talk(key) {
    showMessage(this.scene, 'npc-dialogue.' + key);
  }
}


class Vendor extends NPC {
  constructor(scene, x, y, textureKey, items=null) {
    super(scene, x, y, textureKey);

    // interaction with player
    this.interactionButtonText = 'shop';

    // items that are sold in the shop
    this.items = items || [];
  
  }

  update() {
    this.face(this.scene.player);
  }

  interact() {
    // TODO: make this different for every vendor
    showMessage(
      this.scene, 
      'npc-dialogue.shopping.greeting-options.text', 
      null, null, 
      { 
        key: 'npc-dialogue.shopping.greeting-options.options', 
        callbacks: [
          ()=> {
            // tell the inventory manager that the interaction button shows "info"
            this.manager.events.emit('changeTextInteract', 'buy');
    
            // switch scenes
            this.scene.scene.pause();
            this.scene.scene.run('ShopDisplay', {
              parentScene: this.scene.scene.key,
              items: this.items,
              type: 'buy'
            });
          },
          ()=> { 
            // tell the inventory manager that the interaction button shows "info"
            this.manager.events.emit('changeTextInteract', 'sell');
    
            // switch scenes
            this.scene.scene.pause();
            this.scene.scene.run('ShopDisplay', {
              parentScene: this.scene.scene.key,
              type: 'sell'
            });
          },
          ()=> {
            // leave
            showMessage(this.scene, 'npc-dialogue.shopping.leaving');
          }
        ]
      }
    );
  }
}


class Crop extends Phaser.GameObjects.Image {
  constructor(scene, group, x, y, name, mapIndex) {
    let data = deepcopy(scene.cache.json.get('cropData').croplist[name]);
    super(scene, x, y, 'crops', data.frames[0]);
    this.setData(data);

    // reference to the arable Map of the gameplay scene
    this.mapIndex = mapIndex;

    // reference to game manager
    this.manager = this.scene.scene.get('GameManager');
    
    // add to GameObjects group and scene
    // TODO: this is getting messy....
    group.add(this);
    this.scene.add.existing(this);
    this.scene.allSprites.add(this);
    this.scene.physics.add.existing(this);
    this.scene.interactables.add(this);
    
    this.depthSortY = this.getBounds().top + 8;
    this.scene.depthSortedSprites.add(this);

    // crop frames are of size 16 * 32, with the lower half being the "base"
    this.setOrigin(0, 0.5);
    this.body.setSize(16, 16);
    this.body.setOffset(0, this.height * 0.5);

    // variables for growth and harvesting
    this.growthPhase = 0;
    // this.age = 0;
    this.growth = 0;
    this.harvestReady = false;
    this.fertilizedLevel = 0;  // TODO: add soil class that holds the fertilization

    // calculate the color of particles that appear when the crop is cut
    this.avgColor = getAvgColorButFaster(
      this.scene, this.texture.key, this.data.values.frames[this.data.values.numPhases - 1]
    );

    // interaction with player
    this.interactionButtonText = 'inspect';

    // event listeners
    this.manager.events.on('newDay', this.onNewDay, this);
  }

  get wateringLevel() {
    return this.scene.arableMap[this.mapIndex].waterLevel;
  }

  harvest() {
    if (this.harvestReady) {
      // create a particle effect
      // let particles = this.scene.add.particles(this.data.values.particles, 0);
      let particles = this.scene.add.particles('leaf-particles', 0);
      particles.setDepth(3);

      let emitter = particles.createEmitter({
        x: this.body.center.x,
        y: this.body.center.y,
        quantity: 4,
        frame: {
          frames: [0, 1, 2, 3, 4, 5, 6, 7],
          cycle: false
        },
        active: true,
        // frequency: -1,
        lifespan: 500,
        speed: 10,
        radial: true,
        tint: this.avgColor.color
      });

      emitter.explode();

      // spawn something to collect
      let spawnPos = { x: this.body.center.x, y: this.body.center.y - 8};
      let targetPos = { x: this.body.center.x, y: this.body.center.y};
      let data = deepcopy(this.scene.cache.json.get('itemData').harvest[this.data.values.harvest]);

      // effect of fertillizer
      // TODO: better calculation
      data.quantity *= this.fertilizedLevel + 1;

      let cb = new Collectible(
        this.scene, this.scene.collectibles, spawnPos.x, spawnPos.y, data
      );

      // remove the fertilization level 
      // TODO: calculate how much fertilizer the crop used
      this.scene.arableMap[this.mapIndex].reset();

      // let this collectible bounce a bit
      this.scene.tweens.add({
        targets: cb,
        x: targetPos.x,
        y: targetPos.y,
        duration: 1000,
        ease: 'Bounce'
      });

      this.destroy();
    }
  }

  interact() {
    if (this.harvestReady) {
      showMessage(this.scene, 'interactibles.crops.ready', this);
    } else {
      showMessage(this.scene, 'interactibles.crops.growing', this);
    }
  }

  onNewDay() {
    // plant grows faster when it's properly watered
    if (
      this.scene.arableMap[this.mapIndex].waterLevel > 0 
      || this.growthPhase > this.data.values.wateringPhases - 1
    ) {
      this.growth += 1;
    } else {
      this.growth += 0.5;
    }

    if (this.growth > this.data.values.phaseDurations[this.growthPhase]) {
      this.growthPhase += 1;
      this.growth = 0;

      // change to next texture
      this.setTexture('crops', this.data.values.frames[this.growthPhase]);

      if (this.growthPhase == this.data.values.numPhases) {
        console.log('The crop died.');
        this.destroy();
        return;
      }
    }
    if (this.growthPhase == this.data.values.phaseHarvest) {
      this.harvestReady = true;
    }
  }

  destroy() {
    // wrapper for the destroy method that also removes the event listener
    this.manager.events.off('newDay', this.onNewDay, this);
    super.destroy();
  }
}


class Collectible extends Phaser.GameObjects.Image {
  constructor(scene, group, x, y, itemToAdd) {
    super(scene, x, y, itemToAdd.spritesheet, itemToAdd.frame);
    group.add(this);
    this.scene.add.existing(this);
    this.scene.allSprites.add(this);
    this.scene.physics.add.existing(this);
    this.scene.depthSortedSprites.add(this);

    this.manager = this.scene.scene.get('GameManager');

    this.itemToAdd = deepcopy(itemToAdd);

    // interaction with player
    this.interactionButtonText = 'inspect';

    this.canCollide = false;  // TODO add collision directly instead of using a flag?
    this.manager.time.addEvent({
      delay: 500,
      callback: ()=> { this.canCollide = true; }
    });
  }

  collect() {
    if (this.canCollide) {
      this.manager.events.emit('item-collected', this.itemToAdd);
      this.manager.playSound('item-collect')
      this.destroy();
    }
  }

  interact() {
    showMessage(this.scene, 'interactibles.collectible', this);
  }
}


class Scythe extends Phaser.GameObjects.Image {
  constructor(scene, x, y, imageIndex=2) {
    super(scene, x, y, 'inventory-items', imageIndex);

    scene.add.existing(this);
    scene.depthSortedSprites.add(this);

    scene.time.addEvent({
        delay: 500, 
        callback: () => {
          this.destroy();
          scene.player.tool = null;
        }
    });

    this.player = scene.player;

    if (this.player.lastDir === 'left') {
      this.setFlipX(true);
      this.rotationDir = -1;
      this.setOrigin(0, 1);
    } else {
      this.rotationDir = 1;
      this.setOrigin(1);
    }
  }

  update() {
    this.angle += 10 * this.rotationDir;

    // set position relative to the player
    this.x = this.player.x;
    this.y = this.player.y + ((this.player.lastDir === 'up') ? -4 : 8);
  }
}


class Hoe extends Phaser.GameObjects.Image {
  constructor(scene, x, y, imageIndex=0) {
    super(scene, x, y, 'tools', imageIndex);

    scene.add.existing(this);
    scene.depthSortedSprites.add(this);

    scene.time.addEvent({
        delay: 500, 
        callback: () => {
          this.destroy();
          scene.player.tool = null;
        }
    });

    scene.time.addEvent({
      delay: 250, 
      callback: () => {
        // reverse direction (bouncing effect)
        this.rotationDir *= -1;

        // particle effect
        let particleStartPos = this.player.interactionRect.getCenter();

        let particles = this.scene.add.particles('particles', 2);
        particles.setDepth(3);

        let emitter = particles.createEmitter({
          x: particleStartPos.x,
          y: particleStartPos.y,
          quantity: { min: 3, max: 8 },
          radial: true,
          active: true,
          lifespan: 200,
          speed: 50,
          gravityY: 100,
          alpha: 1,
          tint: 0x3d300b
        });

        emitter.explode();
      }
  });

    this.player = scene.player;

    if (this.player.lastDir === 'left') {
      this.setFlipX(true);
      this.rotationDir = -1;
      this.setOrigin(0, 1);
    } else {
      this.rotationDir = 1;
      this.setOrigin(1);
    }
  }

  update() {
    this.angle += 10 * this.rotationDir;

    // set position relative to the player
    this.x = this.player.x;
    this.y = this.player.y + ((this.player.lastDir === 'up') ? -4 : 8);
  }
}


class WateringCan extends Phaser.GameObjects.Image {
  constructor(scene, x, y, imageIndex=7) {
    super(scene, x, y, 'inventory-items', imageIndex);
    scene.add.existing(this);
    
    this.player = scene.player;

    scene.time.addEvent({
        delay: 1500, 
        callback: () => {
          this.destroy();
          scene.player.tool = null;
        }
    });

    let particleAngle;
    let particleStartPos = { x: 0, x: 0 };

    switch(this.player.lastDir) {
      // TODO clean this up a bit...
      case 'left': 
        this.x = this.player.x - 16;
        this.y = this.player.y + 12;
        particleStartPos.x = this.x;
        particleStartPos.y = this.y - 12;
        particleAngle = 180;
        this.setFlipX(true);
        this.setOrigin(0, 1);
        this.setDepth(this.scene.depthSortedSprites.depth - 1);
        break;
      case 'right': 
        this.x = this.player.x + 16;
        this.y = this.player.y + 14;
        particleStartPos.x = this.x;
        particleStartPos.y = this.y - 12;
        particleAngle = 0;
        this.setOrigin(1);
        this.setDepth(this.scene.depthSortedSprites.depth + 1);
        break;
      case 'up': 
        this.x = this.player.x - 12;
        this.y = this.player.y + 8;
        particleStartPos.x = this.x;
        particleStartPos.y = this.y - 12;
        particleAngle = 270;
        this.setFlipX(true);
        this.setOrigin(0, 1);
        this.setDepth(this.scene.depthSortedSprites.depth - 1);
        break;
      case 'down': 
        this.x = this.player.x + 8;
        this.y = this.player.y + 14;
        particleStartPos.x = this.x;
        particleStartPos.y = this.y - 12;
        particleAngle = 90;
        this.setOrigin(1);
        this.setDepth(this.scene.depthSortedSprites.depth + 1);
        break;
    }

    // add particles for water effect
    let particles = this.scene.add.particles('water-droplet');
    particles.setDepth(3);

    let emitter = particles.createEmitter({
      x: particleStartPos.x,
      y: particleStartPos.y,
      maxParticles: 30,
      active: true,
      lifespan: 500,
      speed: 50,
      gravityY: 100,
      angle: {min: particleAngle - 20, max: particleAngle + 20 },
      alpha: {start: 0.5, end: 0.1}
    });

    emitter.start();
  }
}