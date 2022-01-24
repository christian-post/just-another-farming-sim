const WINDOW_WIDTH = 426;
const WINDOW_HEIGHT = 240;

const COLOR_BACKGROUND = 0x000000;
// const COLOR_BACKGROUND = 0x006022;

// debug settings
const DEBUG = false;
const SCENEWATCHER = false;

// RexUI Plugin File path
// URL_REXUI = 'plugins/rexuiplugin.js'
URL_REXUI = 'plugins/rexuiplugin.min.js'
URL_SCENEWATCHER = 'plugins/phaser-plugin-scene-watcher.umd.js'


const config = {
  type: Phaser.AUTO,
  width: WINDOW_WIDTH,
  height: WINDOW_HEIGHT,
  backgroundColor: COLOR_BACKGROUND,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: DEBUG,
      debugShowBody: true
    }
  },
  antialias: false,
  scale: {
    zoom: 3
  },
  fps: {
    target: 60
  },
  audio: {
    noAudio: true  // set to "off" during testing
  },
  input: {
    gamepad: true
  }
};


const game = new Phaser.Game(config);

// Scene watcher for debugging
if (SCENEWATCHER) {
  game.registry.merge({
    plugins: {
      global: [
        { key: 'SceneWatcher', plugin: PhaserSceneWatcherPlugin, start: true }
      ]
    }
  });
}


// additional configuration to be added to the game registry
game.registry.merge({
  // technical settings
  windowWidth: WINDOW_WIDTH,
  windowHeight: WINDOW_HEIGHT,
  tileSize: 16,
  menuScrollDelay: 200,
  globalMusicVolume: 0.5,
  globalFontFamily: 'Verdana',
  // in-game settings
  ingameTimeSpeed: 20,  // in-game seconds per real-time second
  startingDaytime: {
    hour: 12,
    minutes: 0
  },
  playerStaminaRechargeRate: 1,
  startingMoney: 2000,
  startingMaxStamina: 100,
  wateringCanAmount: 5,  // how much the watering can raises the soil's water level
  maxWateringLevel: 10
});

// define the scenes
game.scene.add('Preload', PreloadingScene, false);   
game.scene.add('GameManager', GameManager, false);
game.scene.add('Title', TitleScene, false);
game.scene.add('Test', TestScene, false);
game.scene.add('InventoryManager', InventoryManager, false); 
game.scene.add('InventoryDisplay', InventoryDisplay, false);
game.scene.add('ShopDisplay', ShopDisplay, false);
game.scene.add('Dialogue', DialogueScene, false);
game.scene.add('Transition', TransitionScene, false);


// load the font
new FontFace("CustomFont", "url(assets/fonts/slkscr.ttf)")
  .load()
  .then(function (loaded) {
    document.fonts.add(loaded);
    game.scene.start('Preload');
  })
  .catch(function (error) {
    return error;
  });

