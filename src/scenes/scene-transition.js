class TransitionScene extends Phaser.Scene {
  create(data) {

    this.sceneFrom = data.sceneFrom;
    this.sceneTo = data.sceneTo;
    this.callback = data.callback;

    this.effectWidth = this.registry.values.windowWidth;
    this.effectHeight = this.registry.values.windowHeight;

    let ellipse = new Phaser.Geom.Ellipse(
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

    this.duration = 1000;

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
    // this is where it's all black
    this.scene.run(this.sceneTo);

    if (this.callback) {
      // execute additional code if necessary
      this.callback(); 
    }

    this.add.tween({
      delay: 200,
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