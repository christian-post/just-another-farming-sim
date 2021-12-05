class PreloadingScene extends Phaser.Scene {
  // scene for loading data before the game begins
  preload () {
    // https://gamedevacademy.org/creating-a-preloading-screen-in-phaser-3/?a=13

    let rectWidth = 200;
    let rectHeight = 24;
    let rectX = windowWidth / 2 - rectWidth / 2;
    let rectY = windowHeight / 2 - rectHeight / 2;
    
    let progressBoxColor = 0x084010;
    let progressBarColor = 0x10bb30;

    var progressBox = this.add.graphics();
    var progressBar = this.add.graphics();
    progressBox.fillStyle(progressBoxColor, 1);
    progressBox.fillRect(rectX, rectY, rectWidth, rectHeight);

    var loadingText = this.make.text({
        x: windowWidth / 2,
        y: windowHeight / 4,
        text: 'Loading...',
        style: {
            fontSize: '20px',
            fill: '#ffffff'
        }
    });
    loadingText.setOrigin(0.5, 0.5);
    
    var percentText = this.make.text({
        x: windowWidth / 2,
        y: windowHeight / 2,
        text: '0%',
        style: {
            fontSize: '18px',
            fill: '#ffffff'
        }
    });
    percentText.setOrigin(0.5, 0.5);
    
    var assetText = this.make.text({
        x: windowWidth / 2,
        y: windowHeight * 0.75,
        text: '',
        style: {
            fontSize: '18px',
            fill: '#ffffff'
        }
    });
    assetText.setOrigin(0.5, 0.5);


    this.load.on('progress', function (value) {
      percentText.setText(parseInt(value * 100) + '%');
      progressBar.clear();
      progressBar.fillStyle(progressBarColor, 1);
      progressBar.fillRect(rectX, rectY, rectWidth * value, rectHeight);
    });
                
    this.load.on('fileprogress', function (file) {
      assetText.setText('Loading asset: ' + file.key);
    });
    
    this.load.on('complete', function () {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
      assetText.destroy();
    });
    

    // TODO: testing the loading screen
    // for (var i = 0; i < 500; i++) {
    //   this.load.image('logo'+i, 'assets/images/sprites/test.png');
    // }

    // Tilesets and Tilemaps
    this.load.image('overworld', 'assets/images/tilesets/!CL_DEMO.png');
    this.load.tilemapTiledJSON('farm', 'assets/tilemaps/farm.json');

    // Data
    this.load.json('cropData', 'assets/data/crops.json');
    this.load.json('itemData', 'assets/data/items.json');
    this.load.json('dialogue', 'assets/data/dialogue.json');
    this.load.json('controls', 'assets/data/controls.json');

    // Sprites
    this.load.image('testSprite', 'assets/images/sprites/test.png');
    this.load.image('lightcone', 'assets/images/sprites/lightcone.png');
    this.load.image('lightcone-lamp', 'assets/images/sprites/lightcone_lamp.png');
    this.load.image('player-shadow', 'assets/images/sprites/shadow.png');

    this.load.image('test-tile', 'assets/images/sprites/test.png');

    let spritesheetList = [
      { key: 'player', file: 'sprites/farmer_own_24.png', w: 24, h: 32 },
      { key: 'npc-man-1', file: 'sprites/npc_man_1.png', w: 24, h: 32 },
      { key: 'npc-woman-1', file: 'sprites/npc_woman_1.png', w: 24, h: 32 },
      { key: 'crops', file: 'sprites/crops_test.png', w: 16, h: 32 },
      { key: 'seeds', file: 'sprites/seed_packs.png', w: 16, h: 16 },
      { key: 'leaf-particles', file: 'sprites/leaf_particles.png', w: 16, h: 16 },
      { key: 'tools', file: 'sprites/tools.png', w: 16, h: 16},
      { key: 'inventory-items', file: 'sprites/inventory_items.png', w: 16, h: 16 },
      { key: 'ui-images', file: 'ui/ui_stuff.png', w: 16, h: 16 }
    ];

    spritesheetList.forEach(elem => {
      this.load.spritesheet(
        elem.key,
        'assets/images/' + elem.file,
        { frameWidth: elem.w, frameHeight: elem.h }
      );
    });


    // audio
    this.load.audio('overworld', 'assets/sound/bgm/gone_fishin_by_memoraphile_CC0.mp3');
  }

  create(nextScene) {

    // store the keymap in registry
    let KeyMap = {};
    for (let key in Phaser.Input.Keyboard.KeyCodes)
    {
        KeyMap[Phaser.Input.Keyboard.KeyCodes[key]] = key;
    }
    this.registry.merge({ keymap: KeyMap });

    // console.log(this.registry.values.keymap[65]);

    this.scene.start(nextScene);
  }
}