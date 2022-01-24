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

    this.buttonCallbacks = {};

    this.manager.checkForGamepad(this);

    // "any key" event to advance
    this.input.gamepad.on('down', ()=> {
      // TODO make a function "switchGameScenes"
      this.scene.stop(this.scene.key);
      this.manager.currentGameScene = 'Test';
      this.scene.start(this.manager.currentGameScene);
    });

    this.input.keyboard.on('keydown', ()=> {
      // TODO make a function "switchGameScenes"
      this.scene.stop(this.scene.key);
      this.manager.currentGameScene = 'Test';
      this.scene.start(this.manager.currentGameScene);
    });

    this.add.graphics()
      .fillStyle(0x006022)
      .fillRect(0, 0, this.registry.values.windowWidth,this.registry.values.windowHeight);

    // Text (TODO: placeholder for actual title sprite)

    let titleText = "[size=14]Oh no! It\'s\n[/size][size=36][b]JUST ANOTHER\nFARMING SIM[/b][/size]"

    this.rexUI.add.BBCodeText(
      this.registry.values.windowWidth * 0.5,
      this.registry.values.windowHeight * 0.3,
      titleText,
      { 
        align: 'center',
        fontSize: '36px'
      }
    )
      .setOrigin(0.5);

    let anyKeyText = this.add.text(
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
      targets: anyKeyText,
      duration: 1000, 
      loop: -1,
      alpha: 0,
      yoyo: true
    })
  }
}

