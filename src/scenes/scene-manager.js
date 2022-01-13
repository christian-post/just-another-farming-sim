let XBOXMAPPING = {
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


class GameManager extends Phaser.Scene {
  /* 
  Handles code that is persistent between game scenes
  */
  preload () {
    //
  }

  create() {
    // load the key mapping from the cache
    this.keyMapping = this.cache.json.get('controls').default;
    this.gamepadMapping = this.cache.json.get('controls').defaultGamepad;

    // start the first scene
    this.currentGameScene = 'Title';
    this.scene.run(this.currentGameScene);

    // gameplay variables and functions that are persistent between scenes
    this.day = 1;
    // ingame daytime (a day has 1,440 minutes): float
    this.minutes = this.registry.values.startingDaytime.hour * 60 + 
                     this.registry.values.startingDaytime.minutes;

    // timer in ms
    this.timer = 0.0;
    this.isNight = true;
    this.timerPaused = false;

    this.hasControl = true;   // flage for whether input is processed

    this.events.on('newDay', this.onNewDay, this);

    // ressource data
    this.registry.merge({
      money: this.registry.values.startingMoney
    });

    // TODO: only for debugging
    this.input.keyboard.on('keydown-T', ()=> {
      this.events.emit('newDay');
    });
  }

  checkForGamepad(scene) {
    if (scene.input.gamepad.total === 0) {
      scene.input.gamepad.once('connected', pad => {
        scene.pad = pad;
        console.log(pad);
        this.configurePad(scene);
      });
    }
    else {
      scene.pad = scene.input.gamepad.pad1;
      this.configurePad(scene);
    }
  }

  update(time, delta) {
    if (!this.timerPaused) {
      // increment the ingame time
      this.timer += delta * this.registry.values.ingameTimeSpeed;

      // check if one minute has passed
      if (this.timer > 60000) {
        this.minutes += 1;

        // check if midnight
        if (this.minutes >= 1440) {
          this.minutes = this.minutes - 1440;
          this.events.emit('newDay');
        }

        if (this.minutes > 1200 || this.minutes < 240) {
          this.isNight = true;
        } else {
          this.isNight = false;
        }

        // convert to displayed time in the inventory
        let displayHour = parseInt(this.minutes / 60).toString().padStart(2, '0');
        let displayMinutes = parseInt(this.minutes % 60).toString().padStart(2, '0');

        this.events.emit('setClock', {hour: displayHour, minutes: displayMinutes});
        
        // reset the timer
        this.timer = this.timer - 60000;
      }
    }
  }

  toggleDaytimePause() {
    this.timerPaused = !this.timerPaused;
  }

  getCurrentGameScene() {
    return this.scene.get(this.currentGameScene);
  }

  get currentInputMapping() {
    // don't use this every frame
    if (this.scene.get(this.currentGameScene).pad) {
      let mapping = {};
      for (const button in this.gamepadMapping) {
        mapping[button] = XBOXMAPPING[this.gamepadMapping[button]];
      }
      return mapping;
    } else {
      return this.keyMapping;
    }
  }

  onNewDay(minutes=360) {
    // defines what happens on a new day
    this.day += 1;
    // refill the player's stamina
    // TODO: make this an event that the UI listenes for
    let player = this.scene.get(this.currentGameScene).player;
    if (player) {
      player.changeStamina(player.maxStamina);
    }
    // set time of day
    this.minutes = minutes;

    // showMessage(this.getCurrentGameScene(), 'general.newDay');
  }

  configurePad(scene) {
    // binds scene-specific functions to gamepad buttons 
    scene.pad.on('down', (index, value, button) => {
      let func;  // TODO I hate this code
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
      }
    });
  }

  configureKeys(scene) {
    scene.keys = addKeysToScene(scene, this.keyMapping);

    let keys = ['interact', 'inventory', 'item1', 'item2'];
    keys.forEach(key => {
      scene.keys[key].on('down', scene.buttonCallbacks[key], scene);
    });
  }
}