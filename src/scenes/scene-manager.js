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

    this.staminaRefillTimer = 0;  // measured in ingame minutes

    this.hasControl = true;   // flage for whether input is processed

    this.events.on('newDay', this.onNewDay, this);

    // ressource data
    this.registry.merge({
      money: this.registry.values.startingMoney,
      maxStamina: this.registry.values.startingMaxStamina,
      stamina: this.registry.values.startingMaxStamina
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

    // global weather
    this.weatherManager = new WeatherManager(this);


    // define the first scene

    this.currentGameScene = 'Title';
    this.scene.run(this.currentGameScene);

    this.overworldScenes = [
      'FarmScene',
      'VillageScene'
    ];

    this.scene.get(this.overworldScenes[0]).events.on('create', ()=> {
      // configure player controls and events
      this.events.on('player-interacts', ()=> {
        this.player.interactButton()
      });
      this.events.on('itemUsed', button => {
        this.player.itemUseButton(button);
      });

      this.events.on('staminaChange', amount => {
        let stamina = this.registry.values.stamina;
        let maxStamina = this.registry.values.maxStamina;

        this.registry.values.stamina = Math.min(maxStamina, Math.max(stamina + amount, 0));
        let percentage = (this.registry.values.stamina / maxStamina) * 100;
        // send data to the UI
        this.events.emit('stamina-bar-change', percentage);

        // reset the timer
        this.staminaRefillTimer = 0;
      });

      // configure the save/quit/options menu
    this.events.on('menuOpen', ()=> {
      this.scene.pause(this.scene.key);
      this.scene.pause(this.currentGameScene);

      this.scene.run('Menu', {
        x: this.registry.values.windowWidth * 0.4,
        y: this.registry.values.windowHeight * 0.5,
        height: this.registry.values.windowHeight * 0.5,
        background: {
          x: this.registry.values.windowWidth * 0.5,
          y: this.registry.values.windowHeight * 0.65,
          w: 140, 
          h: 120,
          color: 0x000000,
          alpha: 0.75
        },
        options: getNestedKey(this.cache.json.get('dialogue'), 'save-menu.options'),
        callbacks: [
          ()=> { 
            // back to game
            this.scene.resume(this.currentGameScene);
            this.scene.resume(this.scene.key);
          },
          ()=> { 
            // save
            this.saveGame('save0');
            showMessage(this.getCurrentGameScene(), 'game-saved');
            this.scene.resume(this.scene.key);
          },
          ()=> { 
            // quit game TODO: make seperate function "endGame" 

            this.overworldScenes.forEach(scene => {
              if (scene !== this.currentGameScene) {
                this.scene.stop(scene);
              }
            });

            this.switchScenes(this.currentGameScene, 'Title', {}, true, true);
            this.scene.get(this.currentGameScene).events.on('shutdown', ()=> {
              this.scene.sleep('InventoryManager');
              this.scene.resume(this.scene.key);
              this.events.removeAllListeners();
            });
          }
        ],
        exitCallback: ()=> { 
          this.scene.resume(this.currentGameScene);
          this.scene.resume(this.scene.key);
          this.events.emit('changeTextInventory', 'inventory');
         }
      });
    });
    });

    // ############ only for debugging #########################################

    if (DEBUG) {
      // let minimap;

      // // minimap testing
      // this.scene.get('FarmScene').events.on('create', scene => {
      //   minimap = scene.cameras.add(this.registry.values.windowWidth - 80, this.registry.values.windowHeight - 60, 80, 60);
      //   minimap.setBounds(0, 0, scene.mapLayers.layer0.width, scene.mapLayers.layer0.height);
      //   minimap.setZoom(0.1);

      //   minimap.on('pointerdown', pointer => {
      //     console.log(pointer)
      //   });
      // })
      

      this.input.keyboard.on('keydown-P', ()=> {
        // TEST
        if (this.getCurrentGameScene().testGroup.getLength() === 0) {
          for (let i=0; i<100; i++) {
            let sprite = this.getCurrentGameScene().add.sprite(
              Phaser.Math.Between(0, 800),
              Phaser.Math.Between(0, 800),
              'test'
            )
              .setDepth(6);
            this.getCurrentGameScene().testGroup.add(sprite);
          }
        } else {
          this.getCurrentGameScene().testGroup.clear(true, true)
        }      
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
        if (DEBUG && this.getCurrentGameScene().cameras.main !== undefined) {
          let worldPoint = this.getCurrentGameScene().cameras.main.getWorldPoint(pointer.x, pointer.y);
          let tileSize = this.registry.values.tileSize;
          console.log(`screen: ${Math.floor(pointer.x)}, ${Math.floor(pointer.y)}  world: ${Math.floor(worldPoint.x)}, ${Math.floor(worldPoint.y)}  tile: ${Math.floor(worldPoint.x / tileSize)}, ${Math.floor(worldPoint.y / tileSize)}`)
        }
      });
      // this.input.on('pointerdown', pointer => {
      //   if (DEBUG && minimap !== undefined) {
      //     if (new Phaser.Geom.Rectangle(this.registry.values.windowWidth - 80, this.registry.values.windowHeight - 60, 80, 60).contains(pointer.x, pointer.y)) {
      //       let worldPoint = minimap.getWorldPoint(pointer.x, pointer.y);

      //       this.player.x = worldPoint.x;
      //       this.player.y = worldPoint.y;
      //     } 
      //   }
      // });

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

        this.events.emit('setClock', { hour: displayHour, minutes: displayMinutes });

        // refill stamina after some time

        this.staminaRefillTimer += 1;
        if (this.staminaRefillTimer > this.registry.values.playerStaminaRechargeDelay) {
          // refill player stamina
          this.events.emit('staminaChange', this.registry.values.playerStaminaRechargeRate);

          this.staminaRefillTimer = 0;
        }
        
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
    // set time of day
    this.minutes = minutes;
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

        case this.gamepadMapping.menu:
          func = scene.buttonCallbacks.menu;
          if (func !== undefined) func();
          break;
      }
    });
  }

  configureKeys(scene) {
    scene.keys = addKeysToScene(scene, this.keyMapping);

    let keys = Object.keys(scene.buttonCallbacks);
    keys.forEach(key => {
      scene.keys[key].on('down', scene.buttonCallbacks[key], scene);
    });
  }

  switchScenes(current, next, createConfig, playTransitionAnim=true, stopScene=false) {

    console.log(`Switching from ${current} to ${next}`);

    if (playTransitionAnim) {
      // Fade out/fade in effect
      this.scene.run('Transition', {
        sceneFrom: current,
        sceneTo: next, 
        callback: null,
        createConfig: createConfig,
        stopScene: stopScene
      });
      
    } else {
      // no effect
      if (stopScene) {
        this.scene.stop(current);
      } else {
        this.scene.sleep(current);
      }
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
      day: this.day,
      daytime: this.minutes,
      money: this.registry.values.money,
      inventory: this.scene.get('InventoryManager').inventory,
      gameScene: this.currentGameScene,
      arableMapData: {},
      soilData: {},
      cropData: {}
    };

    // loop through scenes, if they have arable map --> store data
    this.overworldScenes.forEach(scene => {
      if (this.scene.get(scene).hasArableLand) {
        saveData.arableMapData[scene] = [];
        saveData.soilData[scene] = {};
        this.scene.get(scene).arableMap.forEach((elem, index) => {
          if (elem) {
            // transform arable Map into binary array
            saveData.arableMapData[scene].push(1);
            // SoilPatch data
            saveData.soilData[scene][index] = {
              fertilizationLevel: elem.fertilizationLevel,
              waterLevel: elem.waterLevel
            }
          } else {
            saveData.arableMapData[scene].push(0);
          }
          
        });
        // data to create crops from
        saveData.cropData[scene] = [];
        this.scene.get(scene).crops.getChildren().forEach(crop => {
          saveData.cropData[scene].push(crop.saveData);
        });
      }
    });

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
    this.switchScenes(this.currentGameScene, saveData.gameScene, { playerPos: { x: 0, y: 0 } }, false);

    // overworld scene
    this.scene.get(saveData.gameScene).events.on('create', ()=> {
      this.player.setPosition(saveData.playerPos.x, saveData.playerPos.y);
      // ingame values
      this.day = saveData.day;
      this.setTime(saveData.daytime);
      this.registry.values.money = saveData.money;
    });

    // create the arable maps
    this.overworldScenes.forEach(scene => {
      this.scene.get(scene).events.on('create', ()=> {
        if (this.scene.get(scene).hasArableLand) {

          saveData.arableMapData[scene].forEach((elem, index) => {
            if (elem) {
              // create a SoilPatch object based on the 1D map index
              let pos = convertIndexTo2D(index, this.scene.get(scene).currentMap.width);
              let patch = this.scene.get(scene).createSoilPatch(index, pos.x, pos.y);

              // restore SoilPatch object attributes
              patch.fertilizationLevel = saveData.soilData[scene][index].fertilizationLevel;
              patch.waterLevel = saveData.soilData[scene][index].waterLevel;
            }
          });

          this.scene.get(scene).rebuildArableLayer();

          // create the crops
          saveData.cropData[scene].forEach(elem => {
            let crop = this.scene.get(scene).arableMap[elem.constructor.mapIndex].plantCrop(
              this.scene.get(scene), 
              elem.constructor.x, 
              elem.constructor.y, 
              elem.constructor.name, 
              elem.constructor.mapIndex
            );

            // set attributes of the crop
            for (let [key, value] of Object.entries(elem.attributes)) {
              crop[key] = value;
            }
          });
        }
      });
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