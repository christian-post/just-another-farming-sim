export class TitleScene extends Phaser.Scene {
  preload () {
    this.load.scenePlugin({
      key: 'rexuiplugin',
      url: this.registry.values.rexui_url,
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
      // TODO: button images
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
      options = [
        'New Game',
        'Load Game',
        'Controls',
        'Quit'
      ];
      callbacks = [
        this.newGame.bind(this),
        ()=> { this.manager.loadGameFromSave(saveData); },
        this.showControls.bind(this),
        ()=> { console.log('TODO: quit the game (back to last page?)'); },
      ];
    } else {
      options = [
        'New Game',
        'Controls',
        'Quit'
      ];    // TODO: get from dialogue.json?
      callbacks = [
        this.newGame.bind(this),
        this.showControls.bind(this),
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
    // reset some variables in the manager
    this.manager.configureIngameVariables();

    // start the Inventory Scene and User Interface
    this.scene.run('InventoryManager');

    // execute when there is no save game
    // give the player some items for the start
    let inventoryManager = this.scene.get('InventoryManager');
    let itemData = this.cache.json.get('itemData');

    inventoryManager.events.once('create', ()=> {
      inventoryManager.addItem(itemData.tools.scytheL1);
      inventoryManager.addItem(itemData.tools.wateringCan);
      inventoryManager.addItem(itemData.seeds.wheat, 20);
      inventoryManager.addItem(itemData.tools.fertilizer, 10);
      inventoryManager.addItem(itemData.tools.hoeL1);
    });

    this.manager.switchScenes(this.scene.key, this.nextScene, {playerPos: { x: 256, y: 200 }}, false, true);

    // create a small acre for start
    this.scene.get('FarmScene').events.once('create', scene => {
      this.manager.timerPaused = false;
      scene.makeAcre(9, 15, 10, 4);
    });
  }

  showControls() {
    this.scene.start('ShowControls');
  }
}


export class ShowControls extends Phaser.Scene {
  create() {
    this.manager = this.scene.get('GameManager');

    // "any key" event to go back
    this.input.gamepad.on('down', ()=> {
      this.scene.start('Title');
    });

    this.input.keyboard.on('keydown', ()=> {
      this.scene.start('Title');
    });
    
    let gamepadX = 200;
    let gamepadY = 100;

    // relative button positions on the texture
    let buttonPositions = {
      ls: { x: 52, y: 44 },
      rs: { x: 126, y: 72 },
      a: { x: 148, y: 56 },
      b: { x: 164, y: 42 },
      x: { x: 138, y: 43 },
      y: { x: 154, y: 32 },
      back: { x: 86, y: 42 },
      start: { x: 116, y: 42 },
      lb: { x: 52, y: 10 },
      rb: { x: 152, y: 10 },
      digipad: { x: 76, y: 72 }
    };

    // positions of the text
    let texts = {
      a: {
        text: 'Item 1',
        pos: { x: 300, y: 20 }
      },
      b: {
        text: 'Item 2',
        pos: { x: 300, y: 40 }
      },
      x: {
        text: 'Interact',
        pos: { x: 300, y: 60 }
      },
      y: {
        text: 'Inventory',
        pos: { x: 300, y: 80 }
      }
    };

    this.add.image(gamepadX, gamepadY, 'gamepad')
      .setOrigin(0);

    let textStyle = { 
      color: '#fff', 
      fontSize: '12px', 
      fontFamily: this.registry.values.globalFontFamily
    };

    for (const [key, value] of Object.entries(texts)) {
      this.add.text(value.pos.x, value.pos.y, value.text, textStyle)
        .setOrigin(1, 0.5);

      let line = this.add.graphics();
      line.lineStyle(1, 0x000000);
      line.lineBetween(
        gamepadX + buttonPositions[key].x, 
        value.pos.y, 
        gamepadX + buttonPositions[key].x,
        gamepadY + buttonPositions[key].y
      );

      line.lineBetween(
        gamepadX + buttonPositions[key].x, 
        value.pos.y, 
        value.pos.x + 2,
        value.pos.y
      );
    }
  }
}
