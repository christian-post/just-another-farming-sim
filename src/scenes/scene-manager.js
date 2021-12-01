class GameManager extends Phaser.Scene {
  /* 
  Handles code that is persistent between game scenes
  */
  preload () {
    //
  }

  create() {
    // reference to the cursors
    // TODO might remove this
    this.cursors = this.input.keyboard.createCursorKeys();

    // load the key mapping from the cache
    this.keyMapping = this.cache.json.get('controls').default;
    this.keys = addKeysToScene(this, this.keyMapping);

    // start the User Interface
    this.scene.run('InventoryManager', this);

    // start the first overworld scene
    this.currentGameScene = 'Test';
    this.scene.run(this.currentGameScene);

    // Player action keys
    // TODO: put this in a method that runs for every overworld scene on create()
    let scene = this.scene.get(this.currentGameScene);
    scene.keys = addKeysToScene(scene, this.keyMapping);

    scene.keys.inventory.on('down', ()=> {
      // pause the current overworld scene and show the Inventory
      this.scene.pause(this.currentGameScene);
      this.toggleDaytimePause();
      this.scene.run('InventoryDisplay', this.currentGameScene);
    });

    scene.keys.item1.on('down', () => {
      scene.events.emit('itemUsed', 'item1');
    });

    scene.keys.item2.on('down', () => {
      scene.events.emit('itemUsed', 'item2');
    });

    scene.keys.interact.on('down', () => {
      scene.events.emit('player-interacts');
    });

    // gameplay variables and functions that are persistent between scenes
    this.day = 1;
    // ingame daytime (a day has 1,440 minutes): float
    this.minutes = this.registry.values.startingDaytime.hour * 60 + 
                     this.registry.values.startingDaytime.minutes;

    // timer in ms
    this.timer = 0.0;
    this.isNight = true;
    this.timerPaused = false;

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

  onNewDay() {
    // defines what happens on a new day
    this.day += 1;
    // refill the player's stamina
    // TODO: make this an event that the UI listenes for
    let player = this.scene.get(this.currentGameScene).player;
    if (player) {
      player.changeStamina(player.maxStamina);
    }
    // set time to 6 am
    // this.minutes = 360;

    // showMessage(this.getCurrentGameScene(), 'general.newDay');
  }
}