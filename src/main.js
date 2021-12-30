const windowWidth = 426;
const windowHeight = 240;

const COLOR_BACKGROUND = 0x006022;

// debug settings
const DEBUG = false;
const SCENEWATCHER = false;

// RexUI Plugin File path
// URL_REXUI = 'plugins/rexuiplugin.js'
URL_REXUI = 'plugins/rexuiplugin.min.js'
URL_SCENEWATCHER = 'plugins/phaser-plugin-scene-watcher.umd.js'


const config = {
  type: Phaser.AUTO,
  width: windowWidth,
  height: windowHeight,
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
  windowWidth: windowWidth,
  windowHeight: windowHeight,
  tileSize: 16,
  menuScrollDelay: 200,
  // in-game settings
  ingameTimeSpeed: 20,  // in-game seconds per real-time second
  startingDaytime: {
    hour: 12,
    minutes: 0
  },
  startingMoney: 2000,
  startingMaxStamina: 100
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

// start the game
game.scene.start('Preload');
