import { showMessage } from './user-interface.js';
import { callbacks } from './callbacks.js';
import { Crop } from './sprites.js';
import * as Utils from './utils.js';



export class DialogueTrigger extends Phaser.GameObjects.Rectangle {
  // rectangle that when interacted with, spawns a dialogue box
  constructor(scene, x, y, width, height, dialogueKey, options=null, optionsAreCallbacks){
    super(scene, x, y, width, height);

    this.scene.add.existing(this);
    this.scene.allSprites.add(this);
    this.scene.physics.add.existing(this);
    this.scene.interactables.add(this);   // TODO instead check for inteact() method
    this.setOrigin(0);

    this.interactionButtonText = 'read';

    this.scene.registry.events.on('changedata-debug', (_, value) => {
      this.setFillStyle(0xff0000, 0.3 * + value);
    });

    // TODO: more modular! (cutscenes etc)
    this.dialogueKey = dialogueKey;
    this.optionsKey = '';

    this.optionsCallbacks = [];
    if (options) {
      this.optionsKey = this.dialogueKey + '.options';
      this.dialogueKey += '.text';

      this.options = options;
      
      if (optionsAreCallbacks) {
        options.forEach(option => {
          let callback = Utils.Misc.getNestedKey(callbacks, option);
            this.optionsCallbacks.push(
              callback ? ()=> { callback(this.scene) } : ()=>{}
            );
        });
      } else {
        options.forEach(option => {
          this.optionsCallbacks.push(
            ()=> { showMessage(this.scene, option); }
          )
        });
      }
    }
  }

  interact() {
    showMessage(
      this.scene, this.dialogueKey, this.manager, null, 
      { key: this.optionsKey, callbacks: this.optionsCallbacks }
    );
  }
}


export class InteractTrigger extends Phaser.GameObjects.Rectangle {
  // used for interactive objects in the Tiled data
  constructor(scene, x, y, width, height, callbackKey, callbackArgs, interactionText){
    super(scene, x, y, width, height);

    this.scene.add.existing(this);
    this.scene.allSprites.add(this);
    this.scene.physics.add.existing(this);
    this.setOrigin(0);

    this.callback = Utils.Misc.getNestedKey(callbacks, callbackKey);
    this.callbackArgs = callbackArgs;

    this.interactionButtonText = interactionText;

    // debug overlay
    this.scene.registry.events.on('changedata-debug', (_, value) => {
      this.setFillStyle(0xff0000, 0.3 * + value);
    });
  }

  interact() {
    this.callback(this.scene, this.callbackArgs);
  }
}



export class TeleportTrigger extends Phaser.GameObjects.Rectangle {
  // used for teleporter triggers in the Tiled map data
  constructor(scene, x, y, width, height, targetScene, playerX, playerY){
    super(scene, x, y, width, height);

    this.scene.add.existing(this);
    this.scene.allSprites.add(this);
    this.scene.physics.add.existing(this);
    this.setOrigin(0);

    this.interactionButtonText = '';

    this.scene.registry.events.on('changedata-debug', (_, value) => {
      this.setFillStyle(0xff0000, 0.3 * + value);
    });

    // a player collision results in change of tilemaps
    this.scene.physics.add.overlap(this.scene.player, this, ()=> {
      this.scene.manager.switchScenes(
        this.scene.scene.key,
        targetScene,
        { 
          playerPos: { x: playerX, y: playerY },
          lastDir: this.scene.player.lastDir
        },
        true  // start transition effect scene
      );
    });
  }
}


export class TeleportInteractTrigger extends Phaser.GameObjects.Rectangle {
  // like Teleport, but you have to press the interact button instead of 
  // just colliding with it
  // used for doors etc.
  constructor(scene, x, y, width, height, targetScene, playerX, playerY){
    super(scene, x, y, width, height);
    this.scene.add.existing(this);
    this.scene.allSprites.add(this);
    this.scene.physics.add.existing(this);
    this.setOrigin(0);

    this.manager = this.scene.scene.get('GameManager');

    this.interactionButtonText = 'Enter';
    this.targetScene = targetScene;
    this.playerPos = {
      x: playerX,
      y: playerY
    };

    this.scene.registry.events.on('changedata-debug', (_, value) => {
      this.setFillStyle(0xff0000, 0.3 * + value);
    });
  }

  interact() {
    this.manager.switchScenes(
      this.manager.currentGameScene,
      this.targetScene,
      { 
        playerPos: this.playerPos,
        lastDir: this.manager.getCurrentGameScene().player.lastDir
      },
      true
    );
  }
}


export class SoilPatch extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y, index) {
    super(scene, x, y, scene.registry.values.tileSize, scene.registry.values.tileSize);
    
    this.scene.add.existing(this);
    this.scene.allSprites.add(this);
    this.scene.physics.add.existing(this);
    this.scene.interactables.add(this);
    this.setOrigin(0);

    // TODO: create a seperate varaible for alpha
    this.setFillStyle(0x000000, 0);

    this.index = index;  // refers to 1D index of arable Map

    
    this.fertilizationLevel = 0;
    // water level
    // Plants have to be watered regularly, watering increases the water by a certain value
    // as well as raining.
    // every day without rain decreases the water level by 1
    this.waterLevel = 0;

    this.crop = null;

    this.interactionButtonText = 'inspect';


    // define what happens on a new day
    this.scene.manager.events.on('newDay', ()=> {
      // check for rain
      if (this.scene.manager.weatherManager.currentWeather.rain) {
        this.waterLevel = this.scene.registry.values.maxWateringLevel;
        this.setFillStyle(0x000000, 0.3);
      } else {
        // dry out
        this.waterLevel = Math.max(this.waterLevel - 1, 0);
        this.setFillStyle(0x000000, 0);
      }
      
    });
  }

  plantCrop(scene, cropX, cropY, key, index) {
    // keep a reference to the crop sprite
    this.crop = new Crop(scene, cropX, cropY, key, index);
    return this.crop;
  }

  reset() {
    this.fertilizationLevel = 0;
    this.crop = null;
    this.setFillStyle(0x000000, 0);
  }

  fertilize(level) {
    this.fertilizationLevel += level;
    this.setFillStyle(0x000000, this.fertilizationLevel * 0.2);
  }

  water(level) {
    this.waterLevel = Math.min(this.scene.registry.values.maxWateringLevel, this.waterLevel + level);
    let alpha = 0.5 * (this.waterLevel / this.scene.registry.values.maxWateringLevel);
    this.setFillStyle(0x000000, alpha);
  }

  interact() {
    if (this.crop) {
      this.crop.interact();
    } else {
      showMessage(this.scene, 'interactibles.soilPatch', this.manager);
    }
  }
}