class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    this.scene.physics.add.existing(this);
    this.scene.add.existing(this);
    this.scene.allSprites.add(this);

    // reference to the game manager scene
    this.manager = this.scene.scene.get('GameManager');

    this.setBodySize(16, 12, false);
    this.body.setOffset(5, this.height - this.body.height);
    this.debugShowBody = true;

    // Animations
    let animsFrateRate = 8;
    let animsDuration = 300;  // frame duration in milliseconds
    
    // IDLE

    this.anims.create({
      key: 'player-idle-down',
      frames: [{key: 'player', frame: 1}],
      frameRate: animsFrateRate,
      duration: animsDuration,
      repeat: 0
    });

    this.anims.create({
      key: 'player-idle-up',
      frames: [{key: 'player', frame: 10}],
      frameRate: animsFrateRate,
      duration: animsDuration,
      repeat: 0
    });

    this.anims.create({
      key: 'player-idle-right',
      frames: [{key: 'player', frame: 7}],
      frameRate: animsFrateRate,
      duration: animsDuration,
      repeat: 0
    });

    this.anims.create({
      key: 'player-idle-left',
      frames: [{key: 'player', frame: 4}],
      frameRate: animsFrateRate,
      duration: animsDuration,
      repeat: 0
    });

    // WALKING

    this.anims.create({
      key: 'player-walk-down',
      frames: this.anims.generateFrameNumbers('player', {frames: [0, 1, 2, 1]}),
      frameRate: animsFrateRate,
      duration: animsDuration,
      repeat: -1
    });

    this.anims.create({
      key: 'player-walk-right',
      frames: this.anims.generateFrameNumbers('player', {frames: [6, 7, 8, 7]}),
      frameRate: animsFrateRate,
      duration: animsDuration,
      repeat: -1
    });

    this.anims.create({
      key: 'player-walk-up',
      frames: this.anims.generateFrameNumbers('player', {frames: [9, 10, 11, 10]}),
      frameRate: animsFrateRate,
      duration: animsDuration,
      repeat: -1
    });

    this.anims.create({
      key: 'player-walk-left',
      frames: this.anims.generateFrameNumbers('player', {frames: [3, 4, 5, 4]}),
      frameRate: animsFrateRate,
      duration: animsDuration,
      repeat: -1
    });

    // starting animation (idle)
    this.anims.play('player-idle-down');
    this.lastDir = 'down';

    // make a shadow
    this.shadow = this.scene.add.image(this.x, this.getBounds().bottom, 'player-shadow');
    this.shadow.setAlpha(0.3);
    this.scene.events.on('prerender', ()=> {
      this.shadow.setPosition(this.x, this.getBounds().bottom);
    });

    // Physics
    this.speed = 80;

    this.interactionRect = scene.add.rectangle(
      x, y + this.scene.registry.values.tileSize, 
      this.scene.registry.values.tileSize, this.scene.registry.values.tileSize
    )
      .setOrigin(0.5)
      .setFillStyle()
      .setStrokeStyle(2, 0xDD0000, 0.3)
      .setVisible(false);

    this.scene.physics.add.existing(this.interactionRect);

    // Controls

    // interaction button
    this.scene.events.on('player-interacts', ()=> {
      this.interactButton();
    });

    // Item usage
    this.scene.events.on('itemUsed', button => {
      this.itemUseButton(button);
    }, this);

    // cooldown for seed usage
    this.isSowing = false;

    // resources
    this.maxStamina = 200;
    this.stamina = this.maxStamina;

    // the tool that is currently being used
    this.tool = null; 
  }

  update(delta) {
    // check if a tool is being used
    // if so, the player can't move for that period
    if (this.tool) {
      this.tool.update(delta);
      this.setVelocity(0);
      this.anims.play('player-idle-' + this.lastDir, true);
    } else if (this.isSowing) {
      this.setVelocity(0);
      this.anims.play('player-idle-' + this.lastDir, true);
    } else {
      this.move(delta);
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

    if (this.scene.arableMap[index] === 1) {
      if (!this.interactionRect.visible) { this.interactionRect.setVisible(true) };
    } else {
      if (this.interactionRect.visible) { this.interactionRect.setVisible(false) };
    }

    // check if rectangle is colliding with any interactables
    let collisions = checkCollisionGroup(this.interactionRect, this.scene.allSprites.getChildren());
    if (collisions.length > 0 && collisions[0] != this) {
      let string = collisions[0].interactionButtonText || 'error';
      this.manager.events.emit('show-interaction', string);
    } else {
      this.manager.events.emit('show-interaction', '');
    }
  }

  move(delta) {
    // get the movement vector from the inputs
    let dir = getCursorDirections(this.scene, 0);
    
    let move = new Phaser.Math.Vector2(dir.x, dir.y);
    move.setLength(this.speed);
    this.setVelocity(move.x, move.y);

    // adjust the player's animation
    if (move.lengthSq() === 0) {
      this.anims.play('player-idle-' + this.lastDir, true);
    } else {
      if (dir.x > 0) {
        this.lastDir = 'right';
      } else if (dir.x < 0) {
        this.lastDir = 'left';
      }
      if (dir.y > 0) {
        this.lastDir = 'down';
      } else if (dir.y < 0) {
        this.lastDir = 'up';
      }
      this.anims.play('player-walk-' + this.lastDir, true);
    }
  }

  interactButton() {
    let interactX = parseInt(this.interactionRect.x / this.scene.registry.values.tileSize);
    let interactY = parseInt(this.interactionRect.y / this.scene.registry.values.tileSize);

    if (DEBUG) {
      console.log(interactX, interactY);
    }

    let collisions = checkCollisionGroup(this.interactionRect, this.scene.allSprites.getChildren());
    // let collisions = checkCollisionGroup(this.interactionRect, this.scene.interactables.getChildren());

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
            if (this.scene.arableMap[index] === 1) {
              if (this.checkExhausted()) { return; }
              // plant something
              // get crop type from inventory
      
              if (item && item.quantity > 0) {
                // TODO: check if it is actually a crop, maybe use the callback of the item
                let cropX = this.scene.registry.values.tileSize * interactX;
                let cropY = this.scene.registry.values.tileSize * interactY;
                new Crop(this.scene, this.scene.crops, cropX, cropY, item.name);
      
                item.quantity -= 1;
                // TODO: replace this code with event for the inventory scene
                if (item.quantity > 0) {
                  this.scene.scene.get('InventoryManager').selectedItemQuantities[button].setText(item.quantity);
                } else {
                  // TODO: remove sprite from inventory that the button points to
                  this.scene.scene.get('InventoryManager').removeItem(button);

                  // remove the sprite from the action button
                  this.scene.scene.get('InventoryManager').equipItem(null, button);
                  this.scene.scene.get('InventoryManager').selectedItemQuantities[button].setText('');
                }
                

                // reduce the player's stamina by a bit
                this.changeStamina(-item.stamina);

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
          collisions = checkCollisionGroup(this.interactionRect, this.scene.crops.getChildren());
          if (collisions.length > 0) {
            // check for stamina only if there would be something to interact with
            if (this.checkExhausted()) { return; }
            this.changeStamina(-item.stamina);
          }
          // use the tool
          this.createTool(item, { collisions: collisions });
          break;

        default:
          console.log(`behavior for item "${item.type}" not implemented`);
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
      case 'scythe':
        this.tool = new Scythe(this.scene, this.x, this.y, item.frame);
        // check if collision object has a "harvest" method
        if (config.collisions.length > 0) {
          for (let col of config.collisions) {
            if (col['harvest']) {
              col.harvest();
              break;
            }
          }
        }
        break;
      default:
        console.warn('tool not implemented: ', type);
    }
  }

  checkExhausted() {
    // you can only use items if you have stamina left
    if (this.stamina === 0) {
      showMessage(this.scene, 'general.stamina-low');
      return true;
    } else {
      return false;
    }
  }
}


class NPC extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, textureKey) {
    super(scene, x, y, textureKey);
    this.scene.physics.add.existing(this);
    this.scene.add.existing(this);

    this.scene.allSprites.add(this);
    this.scene.npcs.add(this);
    this.scene.depthSortedSprites.add(this);

    this.key = textureKey;

    // reference to the game manager scene
    this.manager = this.scene.scene.get('GameManager');

    this.setBodySize(16, 16, false);
    this.body.setOffset(this.width * 0.25, this.height * 0.5);
    this.debugShowBody = true;

    // Animations
    // this.setDepth(2);
    let animsFrateRate = 8;
    let animsDuration = 300;  // frame duration in milliseconds
    
    // IDLE
    this.anims.create({
      key: this.key + '-idle-down',
      frames: [{key: this.key, frame: 1}],
      frameRate: animsFrateRate,
      duration: animsDuration,
      repeat: 0
    });

    this.anims.create({
      key: this.key + '-idle-up',
      frames: [{key: this.key, frame: 10}],
      frameRate: animsFrateRate,
      duration: animsDuration,
      repeat: 0
    });

    this.anims.create({
      key: this.key + '-idle-right',
      frames: [{key: this.key, frame: 7}],
      frameRate: animsFrateRate,
      duration: animsDuration,
      repeat: 0
    });

    this.anims.create({
      key: this.key + '-idle-left',
      frames: [{key: this.key, frame: 4}],
      frameRate: animsFrateRate,
      duration: animsDuration,
      repeat: 0
    });

    // WALKING

    this.anims.create({
      key: this.key + '-walk-down',
      frames: this.anims.generateFrameNumbers(this.key, {frames: [0, 1, 2, 1]}),
      frameRate: animsFrateRate,
      duration: animsDuration,
      repeat: -1
    });

    this.anims.create({
      key: this.key + '-walk-right',
      frames: this.anims.generateFrameNumbers(this.key, {frames: [6, 7, 8, 7]}),
      frameRate: animsFrateRate,
      duration: animsDuration,
      repeat: -1
    });

    this.anims.create({
      key: this.key + '-walk-up',
      frames: this.anims.generateFrameNumbers(this.key, {frames: [9, 10, 11, 10]}),
      frameRate: animsFrateRate,
      duration: animsDuration,
      repeat: -1
    });

    this.anims.create({
      key: this.key + '-walk-left',
      frames: this.anims.generateFrameNumbers(this.key, {frames: [3, 4, 5, 4]}),
      frameRate: animsFrateRate,
      duration: animsDuration,
      repeat: -1
    });

    // starting animation (idle)
    this.anims.play(this.key + '-idle-down');
    this.lastDir = 'down';

    // make a shadow
    this.shadow = this.scene.add.image(this.x, this.getBounds().bottom, 'player-shadow');
    this.shadow.setAlpha(0.3);
    this.scene.events.on('prerender', ()=> {
      this.shadow.setPosition(this.x, this.getBounds().bottom);
    });

    // Physics settings
    this.speed = 50;
    this.body.pushable = false;
    this.setCollideWorldBounds(true);

    // TODO: replace with random walking or maybe state machine
    // var timer = this.scene.time.addEvent({
    //   delay: Phaser.Math.Between(1000, 3000),
    //   loop: true,
    //   callback: ()=> {
    //     timer.delay = Phaser.Math.Between(1000, 3000);
    //     // choose one of four direction, or stop
    //     let choice = chooseWeighted([
    //       { x: 1, y: 0 },
    //       { x: 0, y: 1 },
    //       { x: -1, y: 0 },
    //       { x: 0, y: -1 },
    //       { x: 0, y: 0 }
    //     ], [1, 1, 1, 1, 5]);
    //     this.move(choice.x, choice.y);
    //   }
    // });

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

    // interaction with player
    this.interactionButtonText = 'talk';

    this.dialogue = [];
    this.finalDialogue = {
      type: 'normal',
      key: ''
    };
  }

  move(dirX, dirY) {
    let move = new Phaser.Math.Vector2(dirX, dirY);
    move.setLength(this.speed);
    this.setVelocity(move.x, move.y);

    // adjust the NPC's animation
    if (move.lengthSq() === 0) {
      this.anims.play(`${this.key}-idle-${this.lastDir}`, true);
    } else {
      if (dirX > 0) {
        this.lastDir = 'right';
      } else if (dirX < 0) {
        this.lastDir = 'left';
      }
      if (dirY > 0) {
        this.lastDir = 'down';
      } else if (dirY < 0) {
        this.lastDir = 'up';
      }
      this.anims.play(`${this.key}-walk-${this.lastDir}`, true);
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
    if (this.dialogue.length > 0) {
      let dialogue = this.dialogue.shift();

      if (dialogue.type === 'normal') {
        showMessage(this.scene, 'npc-dialogue.' + dialogue.key);
      } else if (dialogue.type === 'options') {
        showMessage(
          this.scene, 'npc-dialogue.' + dialogue.key, 
          null, null, { key: 'npc-dialogue.' + dialogue.optionKey, callbacks: dialogue.callbacks }
        );
      }
    } else {
      // fallback if nothing left
      showMessage(
        this.scene, 'npc-dialogue.' + this.finalDialogue.key, 
        null, null, { key: 'npc-dialogue.' + this.finalDialogue.optionKey, callbacks: this.finalDialogue.callbacks });
    }
  }

  setDialogue(array) {
    if (array.length === 1) {
      this.finalDialogue = {
        key: [...array][0],
        type: 'normal'
      };
    } else {
      this.finalDialogue = {
        key: array.unshift(),
        type: 'normal'
      };
    }
    array.forEach(key => {
      this.dialogue.push({
        key: key,
        type: 'normal'
      })
    });
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
    showMessage(
      this.scene, 
      'npc-dialogue.shopping.greeting-options.text', 
      null, null, 
      { 
        key: 'npc-dialogue.shopping.greeting-options.options', 
        callbacks: [
          ()=> {
            // tell the inventory manager that the interaction button shows "info"
            this.manager.events.emit('show-interaction', 'buy');
    
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
            this.manager.events.emit('show-interaction', 'sell');
    
            // switch scenes
            this.scene.scene.pause();
            this.scene.scene.run('ShopDisplay', {
              parentScene: this.scene.scene.key,
              type: 'sell'
            });
          }
        ]
      }
    );
  }
}


class Crop extends Phaser.GameObjects.Image {
  constructor(scene, group, x, y, name) {
    let data = deepcopy(scene.cache.json.get('cropData').croplist[name]);
    super(scene, x, y, 'crops', data.frames[0]);
    this.setData(data);

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
    this.age = 0;
    this.currentPhaseDay = 0;
    this.harvestReady = false;

    // calculate the color of particles that appear when the crop is cut
    this.avgColor = getAvgColorButFaster(
      this.scene, this.texture.key, this.data.values.frames[this.data.values.numPhases - 1]
    );

    // interaction with player
    this.interactionButtonText = 'inspect';

    // event listeners
    this.manager.events.on('newDay', this.onNewDay, this);
  }

  update() {
    // pass
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
      let data = this.scene.cache.json.get('cropData').harvest[this.data.values.harvest];

      let cb = new Collectible(
        this.scene, this.scene.collectibles, spawnPos.x, spawnPos.y, data
      );

      // cb.setDepth(2);

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
    this.age += 1;
    this.currentPhaseDay += 1;
    if (this.currentPhaseDay > this.data.values.phaseDurations[this.growthPhase]) {
      this.growthPhase += 1;
      this.currentPhaseDay = 0;

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


class DialogueTrigger extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y, width, height, dialogueKey){
    // TODO: color and alpha only for testing
    super(scene, x, y, width, height);
    this.scene.add.existing(this);
    this.scene.allSprites.add(this);
    this.scene.physics.add.existing(this);
    this.scene.interactables.add(this);   // TODO instead check for inteact() method
    this.setOrigin(0);

    this.interactionButtonText = 'read';

    if (DEBUG) {
      this.setFillStyle(0xff0000, 0.3);
    }

    // TODO: more modular! (cutscenes etc)
    this.dialogueKey = dialogueKey;
  }

  interact() {
    showMessage(this.scene, this.dialogueKey);
  }
}