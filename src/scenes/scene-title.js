import { showMessage } from "../user-interface.js";
import * as Utils from "../utils.js";



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
    this.manager.inputHandler.checkForGamepad(this);

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
    // starts the first ingame scene

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
      ];    // TODO: get option text from dialogue.json?
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
    console.log('starting a new game')
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
      inventoryManager.addItem(itemData.feed.pigFeedStandard, 99);
    });

    this.manager.switchScenes(
      this.scene.key, this.nextScene, { playerPos: { x: 256, y: 200 } },
      false, true
    );

    // create a small acre for start
    this.scene.get('FarmScene').events.once('create', scene => {
      this.manager.timerPaused = false;
      scene.makeAcre(9, 15, 10, 4);

      // this.welcomeMessage(scene);

      // create the pig barn (TODO: for testing)
      this.manager.farmData.addBuilding('barn');
    });
  }

  welcomeMessage(scene) {
    // show a tutorial message
    // TODO: add a "repeat" parameter to the options dialogue
    showMessage(
      scene, 'help.intro.text', this.manager, null, 
      {
        key: 'help.intro.options', 
        callbacks: [
          ()=> { showMessage(scene,'help.controls', null, ()=> { this.welcomeMessage(scene) }) }, 
          ()=> { showMessage(scene,'help.farming', null, ()=> { this.welcomeMessage(scene) }) }, 
          ()=> { showMessage(scene,'help.economy', null, ()=> { this.welcomeMessage(scene) }) }, 
          ()=> { showMessage(scene,'help.other', null, ()=> { this.welcomeMessage(scene) }) }
        ]
      });
  }

  showControls() {
    this.scene.start('ShowControls');
  }
}


export class ShowControls extends Phaser.Scene {
  create() {
    this.manager = this.scene.get('GameManager');

    this.manager.inputHandler.checkForGamepad(this);
    
    // get current gamepad mapping, but reversed
    const gamepadMapping = this.cache.json.get('controls').defaultGamepad;
    let reversedGamepadMap = {};

    for (const [key, value] of Object.entries(gamepadMapping)) {
      reversedGamepadMap[value] = key;
    };

    // "any key" event to go back
    this.input.gamepad.on('down', ()=> {
      this.scene.start('Title');
    });

    this.input.keyboard.on('keydown', ()=> {
      this.scene.start('Title');
    });

    const textStyle = { 
      color: '#fff', 
      fontSize: '12px', 
      fontFamily: this.registry.values.globalFontFamily
    };


    // Header
    this.add.text(80, 10, 'Keyboard', textStyle)
      .setOrigin(0.5);
    this.add.text(280, 10, 'Gamepad', textStyle)
      .setOrigin(0.5);


    // Keyboard bindings
    const xStart = 10;
    const yStart = 36;  // start of the first row
    const hSpace = 120;  // between left and right column
    const vSpace = 16;  // vertical space between button descriptions

    const keyboardMapping = this.cache.json.get('controls').default;

    Object.keys(keyboardMapping).forEach((key, index) => {
      this.add.text(
        xStart,
        yStart + vSpace * index,
        `${Utils.Strings.capitalize(key)}:`,
        textStyle
      )
        .setOrigin(0, 0.5);

      this.add.text(
        xStart + hSpace,
        yStart + vSpace * index,
        keyboardMapping[key],
        textStyle
      )
        .setOrigin(1, 0.5);
    });



    // this.pad = true;  // testing only
    // gamepad texture position
    const gamepadX = 180;
    const gamepadY = 100;

    if (!this.pad) {
      this.add.image(gamepadX, gamepadY, 'gamepadMissing')
        .setOrigin(0)
        .setTintFill(0x000000);
  
      this.add.text(280, 150, 'No Gamepad detected', textStyle)
        .setOrigin(0.5);
    } else {
      // relative button positions on the texture
      const buttonPositions = {
        10: { x: 52, y: 44 },       // LS
        11: { x: 126, y: 72 },      // RS
        0: { x: 149, y: 56 },       // A
        1: { x: 164, y: 42 },       // B   
        2: { x: 138, y: 42 },       // X
        3: { x: 153, y: 32 },       // Y
        8: { x: 86, y: 42 },        // BACK
        9: { x: 116, y: 42 },       // START
        4: { x: 52, y: 10 },        // LB
        5: { x: 152, y: 10 },       // RB
        12: { x: 76, y: 72 }        // DIGIPAD (12 - 15)
      };
  
      // positions of the text
  
      const rightColumn = gamepadX + 180;
      const leftColumn = gamepadX + 40;
  
      const texts = {
        12: {
          text: 'Move',  // custom button description if not in gamepad mapping
          pos: { x: leftColumn, y: yStart },
          align: 1  // 1 = right, 0 = left
        },
        8: {
          pos: { x: leftColumn, y: yStart + vSpace },
          align: 1 
        },
        4: {
          pos: { x: leftColumn, y: yStart + 2 * vSpace },
          align: 1
        },
        0: {
          pos: { x: rightColumn, y: yStart },
          align: 0
        },
        1: {
          pos: { x: rightColumn, y: yStart + vSpace },
          align: 0
        },
        2: {
          pos: { x: rightColumn, y: yStart + 2 * vSpace },
          align: 0
        },
        3: {
          pos: { x: rightColumn, y: yStart + 3 * vSpace },
          align: 0
        }
      };
  
      this.add.image(gamepadX, gamepadY, 'gamepad')
        .setOrigin(0);
  
      for (const [key, value] of Object.entries(texts)) {
        
        // button description
        let buttonFunc = reversedGamepadMap[key];
  
        this.add.text(
          value.pos.x, 
          value.pos.y, 
          value.text || Utils.Strings.capitalize(buttonFunc || ''),  // get button descrition either from the texts object, or from mapping
          textStyle)
          .setOrigin(value.align, 0.5);
  
        if (buttonFunc) {
          // if there is a function for this button, draw a line from the text to the gamepad image
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
            value.pos.x + 2 * (value.align === 1 ? 1 : -1),  // offset depending on the alignment
            value.pos.y
          );
        } 
      }
    }
  }
}
