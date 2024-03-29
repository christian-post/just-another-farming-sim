import { DialogueScene, GenericMenu } from './user-interface.js';
import { 
  InventoryManager, 
  InventoryDisplay, 
  ShopDisplayBuy, 
  ShopDisplaySell,
  SpecificItemUseDisplay
} from './managers/inventory-manager.js';
import * as GameScenes from './scenes/scene-overworld.js';
import { PreloadingScene } from './scenes/scene-preload.js';
import { TitleScene, ShowControls } from './scenes/scene-title.js';
import { TransitionScene } from './scenes/scene-transition.js';
import { GameManager } from './managers/game-manager.js';
import { InputManager } from './managers/input-manager.js';



const WINDOW_WIDTH = 426;
const WINDOW_HEIGHT = 240;

const COLOR_BACKGROUND = 0x006022;

// debug settings
const DEBUG = false;
const SCENEWATCHER = false;


let config = {
  parent: "canvas-container",
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
  // antialias: false,
  pixelArt: true,
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


// Scene watcher for debugging
if (SCENEWATCHER) {
  config = Object.assign(config, {
    plugins: {
      global: [
        { key: 'SceneWatcher', plugin: PhaserSceneWatcherPlugin, start: true }
      ]
    }
  });
}


const game = new Phaser.Game(config);

// additional configuration to be added to the game registry
game.registry.merge({
  // technical settings
  rexui_url: 'plugins/rexuiplugin.min.js',
  debug: DEBUG,
  windowWidth: WINDOW_WIDTH,
  windowHeight: WINDOW_HEIGHT,
  tileSize: 16,
  menuScrollDelay: 200,
  textSpeed: 50,
  globalMusicVolume: 0,
  globalSoundeffectsVolume: 0.5,
  // globalFontFamily: 'CustomFont',
  globalFontFamily: 'Verdana',
  // in-game settings
  playerWalkSpeed: 80,
  playerDebugSpeed: 300,  // player running speed when in debug mode (normal = 80)
  ingameTimeSpeed: 60,  // in-game seconds per real-time second (normal = 60)
  startingDaytime: {
    hour: 12,
    minutes: 0
  },
  playerStaminaRechargeRate: 100,  // how much stamina is refilled
  playerStaminaRechargeDelay: 10,  // ingame minutes until stamina is refilled by the given amount
  startingMoney: 10000,
  startingMaxStamina: 200,
  wateringCanAmount: 2,  // how much the watering can raises the soil's water level
  maxWateringLevel: 4
});

// define the scenes
game.scene.add('Preload', PreloadingScene, false);   
game.scene.add('GameManager', GameManager, false);
game.scene.add('InputManager', InputManager, false);
game.scene.add('Title', TitleScene, false);
game.scene.add('ShowControls', ShowControls, false);
// In Game scenes
game.scene.add('FarmScene', GameScenes.FarmScene, false);
game.scene.add('VillageScene', GameScenes.VillageScene, false);
game.scene.add('BarnInteriorScene', GameScenes.BarnInteriorScene, false);
game.scene.add('HouseInteriorScene', GameScenes.HouseInteriorScene, false);

game.scene.add('InventoryManager', InventoryManager, false); 
game.scene.add('InventoryDisplay', InventoryDisplay, false);
game.scene.add('ShopDisplayBuy', ShopDisplayBuy, false);
game.scene.add('ShopDisplaySell', ShopDisplaySell, false);
game.scene.add('SpecificItemUseDisplay', SpecificItemUseDisplay, false);
game.scene.add('Dialogue', DialogueScene, false);
game.scene.add('Transition', TransitionScene, false);
game.scene.add('Menu', GenericMenu, false);


// load a custom font
new FontFace("CustomFont", "url(assets/fonts/slkscr.ttf)")
  .load()
  .then(function (loaded) {
    document.fonts.add(loaded);
    game.scene.start('Preload');
  })
  .catch(function (error) {
    return error;
  });

