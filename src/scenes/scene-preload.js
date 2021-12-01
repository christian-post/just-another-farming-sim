class PreloadingScene extends Phaser.Scene {
  // scene for loading data before the game begins
  preload () {
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