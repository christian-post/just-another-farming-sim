export class TransitionScene extends Phaser.Scene {
  create(data) {
    if (typeof data.sceneFrom === 'string') {
      this.sceneFrom = this.scene.get(data.sceneFrom);
    } else {
      this.sceneFrom = data.sceneFrom;
    }

    if (typeof data.sceneTo === 'string') {
      this.sceneTo = this.scene.get(data.sceneTo);
    } else {
      this.sceneTo = data.sceneTo;
    }

    this.callback = data.callback;
    this.stopScene = data.stopScene;
    this.createConfig = data.createConfig || {};


    this.effectWidth = this.registry.values.windowWidth;
    this.effectHeight = this.registry.values.windowHeight;

    // TODO center ellipse around player
    let cameraView = this.scene.get(this.sceneFrom).cameras.main.worldView;
    let player = this.scene.get(this.sceneFrom).player;
    let screenX = player.x - cameraView.x;
    let screenY = player.y - cameraView.y;

    let ellipse = new Phaser.Geom.Ellipse(
      // screenX, 
      // screenY,
      this.registry.values.windowWidth / 2, 
      this.registry.values.windowHeight / 2, 
      this.effectWidth, 
      this.effectHeight
    );

    let rect = new Phaser.Geom.Rectangle(
      0, 
      0, 
      this.effectWidth, 
      this.effectHeight
    );

    this.add.graphics()
      .fillStyle(0x000000)
      .fillRectShape(rect);

    this.add.graphics()
      .fillEllipseShape(ellipse)
      .generateTexture('mask');
    
    this.mask = this.add.image(0, 0, 'mask')
      .setPosition(this.registry.values.windowWidth / 2, this.registry.values.windowHeight / 2)
      .setVisible(false);
    
    let cameraMask = new Phaser.Display.Masks.BitmapMask(this, this.mask);
    cameraMask.invertAlpha = true;

    this.cameras.main.setMask(
      cameraMask
    );

    this.duration = 600;  // time until fully black
    this.delay = 100;  // time between the two tweens

    this.scene.pause(this.sceneFrom);

    this.scene.bringToTop(this.scene.key);

    this.add.tween({
      targets: this.mask,
      duration: this.duration,
      displayWidth: 0,
      displayHeight: 0,
      onComplete: this.onExpand.bind(this)
    });
  }
  
  onExpand() {
    // this happens when it's all black
    if (this.stopScene) {
      this.scene.stop(this.sceneFrom);
    } else {
      this.scene.sleep(this.sceneFrom);
    }
    this.scene.run(this.sceneTo, this.createConfig);
    this.scene.get('GameManager').currentGameScene = this.sceneTo.scene.key;

    // if scene was paused and is resumed, change the player's position
    this.scene.get(this.sceneTo).events.on('wake', ()=> {
      let player = this.scene.get(this.sceneTo).player;
      if ('playerPos' in this.createConfig) {
        player.setPosition(this.createConfig.playerPos.x, this.createConfig.playerPos.y);
      }
      if ('lastDir' in this.createConfig) {
        player.lastDir = this.createConfig.lastDir;
      }
    });


    if (this.callback) {
      // execute additional code if given to constructor
      this.callback(); 
    }

    this.add.tween({
      delay: this.delay,
      targets: this.mask,
      duration: this.duration,
      displayWidth: this.effectWidth,
      displayHeight: this.effectHeight,
      onComplete: () => {
        this.cameras.main.clearMask();
        this.mask.destroy();
        // get rid of the Transition scene
        this.scene.stop(this.scene.key);
      }
    });
  }
}