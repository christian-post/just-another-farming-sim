class TitleScene extends Phaser.Scene {
  preload () {
    this.load.scenePlugin({
      key: 'rexuiplugin',
      url: URL_REXUI,
      sceneKey: 'rexUI'
    });
  }

  create() {
    this.manager = this.scene.get('GameManager');
    this.nextScene = 'FarmScene';

    this.buttonCallbacks = {};

    this.pad = null;
    this.manager.checkForGamepad(this);

    // "any key" event to advance
    this.input.gamepad.on('down', ()=> {
      this.startGame();
    });

    this.input.keyboard.on('keydown', ()=> {
      this.startGame();
    });

    this.add.graphics()
      .fillStyle(0x006022)
      .fillRect(0, 0, this.registry.values.windowWidth,this.registry.values.windowHeight);

    // Text (TODO: placeholder for actual title sprite)

    let titleText = "[size=14]Oh no! It\'s\n[/size][size=36][b]JUST ANOTHER\nFARMING SIM[/b][/size]"

    this.title = this.rexUI.add.BBCodeText(
      this.registry.values.windowWidth * 0.5,
      this.registry.values.windowHeight * 0.3,
      titleText,
      { 
        align: 'center',
        fontSize: '36px'
      }
    )
      .setOrigin(0.5);

    this.anyKeyText = this.add.text(
      this.registry.values.windowWidth * 0.5,
      this.registry.values.windowHeight * 0.75,
      'Press any Key or Button',
      { 
        color: '#fff', 
        fontSize: '18px', 
        fontFamily: this.registry.values.globalFontFamily
      }
    )
      .setOrigin(0.5); 

    // blinking text
    this.add.tween({
      targets: this.anyKeyText,
      duration: 1000, 
      loop: -1,
      alpha: 0,
      yoyo: true
    });

    // text that indicates which buttons to press
    this.helpTextElements = this.add.group();

    let fontStyle = { 
      color: '#fff', 
      fontSize: '12px', 
      fontFamily: this.registry.values.globalFontFamily
    };

    let text1 = this.add.text(
      this.registry.values.windowWidth - 60, 
      this.registry.values.windowHeight - 50, 
      'select', 
      fontStyle
    );
    this.helpTextElements.add(text1);

    let text2 = this.add.text(
      this.registry.values.windowWidth - 60, 
      this.registry.values.windowHeight - 25, 
      'back', 
      fontStyle
    );
    this.helpTextElements.add(text2);

    if (this.pad) {

    } else {
      // no gamepad detected
      let textKey1 = this.add.text(
        text1.getLeftCenter().x,
        text1.getLeftCenter().y,
        // TODO button mapping
        'W: ',
        fontStyle
      ).setOrigin(1, 0.5);
      this.helpTextElements.add(textKey1);

      let textKey2 = this.add.text(
        text2.getLeftCenter().x,
        text2.getLeftCenter().y,
        // TODO button mapping
        'E: ',
        fontStyle
      ).setOrigin(1, 0.5);
      this.helpTextElements.add(textKey2);
    }


    this.helpTextElements.setVisible(false);
  }

  startGame() {
    // starts the ingame scene

    // check if there is a saved game
    let saveData = this.manager.loadSaveFile('save0');

    let options;
    let callbacks;

    if (saveData) {
      options = ['New Game', 'Load Game', 'Quit'];    // TODO: get from dialogue.json
      callbacks = [
        this.newGame.bind(this),
        ()=> { this.manager.loadGameFromSave(saveData); },
        ()=> { console.log('TODO: quit the game (back to last page?)'); },
      ];
    } else {
      options = ['New Game', 'Quit'];    // TODO: get from dialogue.json
      callbacks = [
        this.newGame.bind(this),
        ()=> { console.log('TODO: quit the game (back to last page?)'); },
      ];
    }

    this.scene.pause(this.scene.key);
    this.title.setVisible(false);
    this.anyKeyText.setVisible(false);
    this.helpTextElements.setVisible(true);

    this.scene.run('Menu', {
      x: this.registry.values.windowWidth * 0.4,
      y: this.registry.values.windowHeight * 0.5,
      height: this.registry.values.windowHeight * 0.5,
      options: options,
      callbacks: callbacks,
      exitCallback: ()=> {
        this.scene.resume(this.scene.key);
        this.title.setVisible(true);
        this.anyKeyText.setVisible(true);
        this.helpTextElements.setVisible(false);
      }
    });
  }

  newGame() {
    // start the Inventory Scene and User Interface
    this.scene.run('InventoryManager');

    // execute when there is no save game
    // give the player some items for the start
    let inventoryManager = this.scene.get('InventoryManager');
    let itemData = this.cache.json.get('itemData');

    inventoryManager.events.on('create', ()=> {
      inventoryManager.addItem(itemData.tools.scytheL1);
      inventoryManager.addItem(itemData.tools.wateringCan);
      inventoryManager.addItem(itemData.seeds.wheat, 20);
      inventoryManager.addItem(itemData.tools.fertilizer, 10);
      inventoryManager.addItem(itemData.tools.hoeL1);

      // this.scene.setVisible(false, 'InventoryManager');
    });

    this.manager.switchScenes(this.scene.key, this.nextScene, {playerPos: { x: 256, y: 200 }}, false, true);

    // create a small acre for start
    this.scene.get('FarmScene').events.once('create', scene => {
      scene.makeAcre(9, 15, 10, 4);
    });
  }
}

