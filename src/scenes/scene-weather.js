import * as Utils from '../utils.js';


export class WeatherManager {
  constructor(scene) {
    this.scene = scene;

    this.currentWeather = {
      rain: false,
      storm: false,
    };

    this.rainIntensity = 0;
    this.windSpeed = 1;

    // super simple weather forecast
    // TODO: more complex!

    this.forecast = [];
    for (let i = 0; i < 7; i++) {
      this.forecast[i] = this.makeForecast();
    }

    this.scene.events.on('newDay', ()=> {
      // get current weather
      let weather = this.forecast.shift();

      // check if it is not midnight
      // if minutes is not 0, this means the time skipped and it should start to rain right away
      let delay = this.scene.minutes === 0 ? 20000 : 0

      if (weather.rain) {
        this.startRaining(1, delay);
      } else {
        this.stopRaining(delay);
      }

      // add a new day of forecast
      this.forecast.push(this.makeForecast());
    });
  }


  makeForecast() {
    return {
      rain: Math.random() < 0.4 ? true : false,
      storm: Math.random() < 0.1 ? true : false
    };
  }


  startRaining(intensity, duration, onComplete) {
    this.currentWeather.rain = true;
    this.scene.events.emit('startRaining');

    this.scene.add.tween({
      targets: this,
      rainIntensity: intensity,
      duration: duration,
      ease: Phaser.Math.Easing.Quartic.In,
      onComplete: onComplete || null
    });
  }

  stopRaining(duration) {
    this.scene.add.tween({
      targets: this,
      rainIntensity: 0,
      duration: duration, 
      ease: Phaser.Math.Easing.Quartic.Out,
      onComplete: ()=> {
        this.currentWeather.rain = false;
        this.scene.events.emit('stopRaining');
      }
    });
  }
}



export class WeatherDisplayManager {
  // responsible for displaying the weather effects, part of each overworld Scene
  constructor(scene) {
    this.scene = scene;

    // reference to the manager that simulates the global weather data
    this.gameManager = this.scene.scene.get('GameManager');

    this.raindropTimer = 0;
    this.rainFrequency = 50;
    // this.rainAmount = 1;
    this.rainAmount = 60;

    // group that contains all the weather-related visual objects 
    this.rainEffects = this.scene.add.group();
    this.rainEffects.runChildUpdate = true;

    // define the bounds that extend the viewport, where the drops are spawned
    this.bounds = {
      top: 100,
      bottom: 0,
      right: 20,
      left: 20
    };

    // fog effect
    this.fog = this.scene.add.graphics();
    let color = 0x666688;
    this.fog.fillGradientStyle(color, color, color, color, 0.9, 0.9, 0.2, 0.2);
    this.fog.fillRect(-2, -2, this.scene.registry.values.windowWidth + 4, this.scene.registry.values.windowHeight + 4);
    this.fog.setDepth(10);
    this.fog.setVisible(false);
    this.fog.setAlpha(0);

    // exclude from camera
    this.fog.setScrollFactor(0);


    // kill all effects etc on scene change
    this.scene.events.on('sleep', scene => {
      if (this.rainEffects.children) {
        this.rainEffects.clear(true, true);
      }
    });

    this.gameManager.events.on('startRaining', ()=> {
      this.fog.setVisible(true);
    });

    this.gameManager.events.on('stopRaining', ()=> {
      this.fog.setVisible(false);
    });
  }

  update(delta) {
    if (this.gameManager.weatherManager.currentWeather.rain) {
      this.raindropTimer += delta;

      // change fog effect visibility
      // let cam = this.scene.cameras.main;
      // this.fog.setPosition(cam.worldView.x, cam.worldView.y);
      this.fog.setAlpha(Math.min(1, this.gameManager.weatherManager.rainIntensity));

      // assert that fog is visible (could have been skipped due to scene change)
      if (!this.fog.visible) {
        this.fog.setVisible(true);
      }
    }

    // spawn rain droplets
    if (this.raindropTimer >= this.rainFrequency) {
      this.raindropTimer -= this.rainFrequency;

      let numDrops = Math.floor(this.rainAmount * this.gameManager.weatherManager.rainIntensity);
      for (let i = 0; i < numDrops; i++) {
        let pos = this.getRandomPos();
        let droplet = new RainDroplet(this, pos.x, pos.y);
        this.rainEffects.add(droplet);
      }
    }
  }

  getRandomPos() {
    let cam = this.scene.cameras.main;
    return {
      x: Phaser.Math.Between(cam.worldView.x - this.bounds.left, cam.worldView.x + cam.worldView.width + this.bounds.right),
      y: Phaser.Math.Between(cam.worldView.y - this.bounds.top, cam.worldView.y + cam.worldView.height + this.bounds.bottom)
    };
  }
}


class RainDroplet extends Phaser.GameObjects.GameObject {
  constructor(manager, x, y) {
    super(manager.scene);

    this.manager = manager;

    this.x = x;
    this.y = y;

    this.speed = {
      x: 0.3 * this.manager.gameManager.weatherManager.windSpeed,  
      y: 1.5
    };
    

    this.line = this.scene.add.graphics()
      .setDepth(this.scene.depthValues.mapAboveSprites);
    this.manager.rainEffects.add(this.line);

    this.height = this.manager.bounds.top;
    
    let lowerY = this.scene.cameras.main.worldView.y - this.manager.bounds.top;
    let upperY = this.scene.cameras.main.worldView.y + this.scene.cameras.main.worldView.height + this.manager.bounds.bottom;
    this.alpha = Utils.Math.map(y, lowerY, upperY, 0.2, 1);
  }

  update(time, delta) {
    this.height -= this.speed.y * delta;
    if (this.height <= 0) {
      this.manager.rainEffects.add(createSplash(this.scene, this.x, this.y));
      this.destroy();
    }

    let newX = this.x + this.speed.x * delta;
    let newY = this.y + this.speed.y * delta;

    // draw a line
    this.line.clear();
    this.line.lineStyle(1, 0xddddff, this.alpha);
    this.line.moveTo(this.x, this.y);
    this.line.lineTo(newX, newY);
    this.line.strokePath();

    this.x = newX;
    this.y = newY;
  }

  destroy() {
    super.destroy();
    this.line.destroy();
  }
}


const createSplash = function(scene, x, y) {

  let splash = scene.add.sprite(x, y, 'raindrop', 0)
    .setDepth(scene.mapLayers.layer0.depth);

  splash.anims.create({
    key: 'default',
    frames: 'raindrop',
    frameRate: 24
  });
  splash.anims.play('default');

  splash.on('animationcomplete', ()=> { splash.destroy(); });

  return splash;
} 


