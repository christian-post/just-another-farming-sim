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

    // Music and Sounds

    let music = [
      'overworld'
    ];

    this.music = {};
    music.forEach(key => {
      this.music[key] = this.sound.add(
        key, 
        { 
          loop: true,
          volume: this.registry.values.globalMusicVolume
        }
      );
    });

    let sounds = [
      'item-collect'
    ];

    this.sounds = {};
    sounds.forEach(key => {
      this.sounds[key] = this.sound.add(
        key, 
        { 
          loop: false,
          volume: this.registry.values.globalSoundeffectsVolume
        }
      );
    });

    // start the first scene

    // this.loadSaveFile();

    this.currentGameScene = 'Title';
    this.scene.run(this.currentGameScene);


    // ############ only for debugging #########################################

    if (DEBUG) {
      this.input.keyboard.on('keydown-P', ()=> {
        if (!this.getCurrentGameScene().pathfinder) { return; }
        this.events.emit('path-test');
      });

      this.input.keyboard.on('keydown-T', ()=> {
        this.saveGame('save0');
        console.log('game saved');
      });

      this.input.keyboard.on('keydown-U', ()=> {
        this.eraseSave('save0');
        console.log('game save erased');
      });

      this.input.on('pointerdown', pointer => {
        if (DEBUG) {
          let worldPoint = this.getCurrentGameScene().cameras.main.getWorldPoint(pointer.x, pointer.y);
          let tileSize = this.registry.values.tileSize;

          console.log(`screen: ${Math.floor(pointer.x)}, ${Math.floor(pointer.y)}  world: ${Math.floor(worldPoint.x)}, ${Math.floor(worldPoint.y)}  tile: ${Math.floor(worldPoint.x / tileSize)}, ${Math.floor(worldPoint.y / tileSize)}`)
        }
      });

      this.input.keyboard.on('keydown-M', ()=> {
        if (this.currentGameScene === 'FarmScene') {
          this.switchScenes(
            this.currentGameScene, 'VillageScene', 
            { 
              playerPos: { x: 348, y: 300 }, 
              lastDir: this.scene.get(this.currentGameScene).player.lastDir
            },
            true
          );
        } else {
          this.switchScenes(
            this.currentGameScene, 'FarmScene', 
            { 
              playerPos: { x: 320, y: 212 }, 
              lastDir: this.scene.get(this.currentGameScene).player.lastDir
            },
            true
          );
        }
      });
    }
  }

  checkForGamepad(scene) {
    if (scene.input.gamepad.total === 0) {
      scene.input.gamepad.once('connected', pad => {
        scene.pad = pad;
        console.log(`pad connected: ${pad}`);
        this.configurePad(scene);
      });
    }
    else {
      scene.pad = scene.input.gamepad.pad1;
      this.configurePad(scene);
    }
  }

  playMusic(key) {
    if (this.registry.values.globalMusicVolume > 0) {
      this.music[key].play();
    }
  }

  playSound(key) {
    if (this.registry.values.globalSoundeffectsVolume > 0) {
      this.sounds[key].play();
    }
  }

  update(time, delta) {
    if (!this.timerPaused) {
      // increment the ingame time
      this.timer += delta * this.registry.values.ingameTimeSpeed;

      // check if one minute has passed
      if (this.timer > 60000) {
        this.minutes += 1;

        // refill player stamina
        this.events.emit('refillStamina', this.registry.values.playerStaminaRechargeRate);

        // check if midnight
        if (this.minutes >= 1440) {
          this.minutes = this.minutes - 1440;
          this.events.emit('newDay', this.minutes);
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

  setTime(minutes) {
    this.minuts = minutes;
    this.timer = 60000;
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

  get player() {
    // reference to the player sprite of the current game scene
    return this.getCurrentGameScene().player;
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

  switchScenes(current, next, createConfig, playTransitionAnim=true) {

    console.log(`Switching from ${current} to ${next}`);

    if (playTransitionAnim) {
      // Fade out/fade in effect
      this.scene.run('Transition', {
        sceneFrom: current,
        sceneTo: next, 
        callback: null,
        createConfig: createConfig
      });
      
    } else {
      this.scene.stop(current);
      this.currentGameScene = next;
      this.scene.run(next, createConfig);
    }
  }

  saveGame(key) {
    let saveData = {
      playerPos: {
        x: this.player.x,
        y: this.player.y
      },
      daytime: this.minutes,
      money: this.registry.values.money,
      inventory: this.scene.get('InventoryManager').inventory,
      gameScene: this.currentGameScene
    };

    localStorage.setItem(key, JSON.stringify(saveData));
  }

  loadSaveFile(key) {
    let saveObject = localStorage.getItem(key) || null;
    if (saveObject) {
      return JSON.parse(saveObject);
    } else {
      return null;
    }
  }

  loadGameFromSave(saveData) {
    this.switchScenes(this.currentGameScene, saveData.gameScene, {playerPos: { x: 0, y: 0 }}, false);

    // overworld scene
    this.scene.get(saveData.gameScene).events.on('create', ()=> {
      this.player.setPosition(saveData.playerPos.x, saveData.playerPos.y);
      this.setTime(saveData.daytime);
      this.registry.vaules.money = saveData.money;
    });

    // items
    this.scene.get('InventoryManager').events.on('create', ()=> {
      this.scene.get('InventoryManager').inventory = saveData.inventory;
    });
  }

  eraseSave(key) {
    localStorage.removeItem(key);
  }
}