import * as Utils from '../utils.js';



const XBOXMAPPING = {
  0: 'A',
  1: 'B',
  2: 'X',
  3: 'Y',
  4: 'LB',
  5: 'RB',
  6: 'LT',
  7: 'RT',
  8: 'BACK',
  9: 'START',
  10: 'LS',
  11: 'RS',
  12: 'UP',
  13: 'DOWN',
  14: 'LEFT',
  15: 'RIGHT'
};


export class InputManager extends Phaser.Scene {
  // Handles Input, active all the time
  create() {
    this.manager = this.scene.get('GameManager');

    // load the key mappings from the cache
    this.keyMapping = this.cache.json.get('controls').default;
    this.gamepadMapping = this.cache.json.get('controls').defaultGamepad;

    this.delayTimer = 100;  // forces delay between directional button presses

    this.manager.events.on('overworld-start', ()=> {
      // stuff that happens when the first overworld scene is created

      // initialize player controls
      this.manager.events.on('player-interacts', ()=> {
        this.manager.player.interactButton()
      });
      this.manager.events.on('itemUsed', button => {
        this.manager.player.itemUseButton(button);
      });
    });
  }


  checkForGamepad(scene) {
    if (scene.input.gamepad.total === 0) {
      scene.input.gamepad.once('connected', pad => {
        scene.pad = pad;
        console.log(`pad connected: ${pad.id}`);
        this.configurePad(scene);
      });
    }
    else {
      scene.pad = scene.input.gamepad.pad1;
      this.configurePad(scene);
    }
  }


  get currentInputMapping() {
    // primarily for use with string replacement from dialogue.json
    // don't use this every frame!
    if (this.scene.get(this.manager.currentGameScene).pad) {
      let mapping = {};
      for (const button in this.gamepadMapping) {
        mapping[button] = XBOXMAPPING[this.gamepadMapping[button]];
      }
      return mapping;
    } else {
      return this.keyMapping;
    }
  }


  configurePad(scene) {
    // binds scene-specific functions to gamepad buttons 
    scene.pad.on('down', (index, value, button) => {
      let func;  // TODO I hate this code

      // if (this.registry.values.debug) {
      //   console.log(`Gamepad button ${index} pressed`);
      // }

      switch(index) {
        case this.gamepadMapping.item1:
          func = scene.buttonCallbacks.item1;
          if (func !== undefined) func();
          break;

        case this.gamepadMapping.item2:
          func = scene.buttonCallbacks.item2;
          if (func !== undefined) func();
          break;

        case this.gamepadMapping.interact:
          func = scene.buttonCallbacks.interact;
          if (func !== undefined) func();
          break;

        case this.gamepadMapping.inventory:
          func = scene.buttonCallbacks.inventory;
          if (func !== undefined) func();
          break;

        case this.gamepadMapping.menu:
          func = scene.buttonCallbacks.menu;
          if (func !== undefined) func();
          break;
      }
    });
  }

  addKeysToScene(scene, keyMapping) {
    let keys = {};
    for (const key in keyMapping) {
      keys[key] = scene.input.keyboard.addKey(keyMapping[key]);
    }
    return keys;
  }


  configureKeys(scene) {
    scene.keys = this.addKeysToScene(scene, this.keyMapping);

    let keys = Object.keys(scene.buttonCallbacks);
    keys.forEach(key => {
      scene.keys[key].on('down', scene.buttonCallbacks[key], scene);
    });
  }


  getCursorDirections (scene, delay=null, delta) {
    let dirX = 0;
    let dirY = 0;
  
    // check gamepad first
    if (scene.pad) {
  
      if (delay && this.delayTimer >= 0) {
        this.delayTimer -= delta;
      } else {
        let right = this.gamepadMapping.right;
        let left = this.gamepadMapping.left;
        let down = this.gamepadMapping.down;
        let up = this.gamepadMapping.up;
        
        dirX = scene.pad.getButtonValue(right) - scene.pad.getButtonValue(left);
        dirY = scene.pad.getButtonValue(down) - scene.pad.getButtonValue(up);
  
        if (delay) { 
          this.delayTimer = delay; 
          if (dirX === 0 && dirY === 0) {
            this.delayTimer = 0;
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
    
    return new Phaser.Math.Vector2(dirX, dirY);
  }

}