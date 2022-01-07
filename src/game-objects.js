class DialogueTrigger extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y, width, height, dialogueKey, options=null, optionsAreCallbacks){
    // TODO: color and alpha only for testing
    super(scene, x, y, width, height);
    this.scene.add.existing(this);
    this.scene.allSprites.add(this);
    this.scene.physics.add.existing(this);
    this.scene.interactables.add(this);   // TODO instead check for inteact() method
    this.setOrigin(0);

    this.interactionButtonText = 'read';

    if (DEBUG) {
      this.setFillStyle(0xff0000, 0.3);
    }

    // TODO: more modular! (cutscenes etc)
    this.dialogueKey = dialogueKey;
    this.optionsKey = '';

    this.optionsCallbacks = [];
    if (options) {
      this.optionsKey = this.dialogueKey + '.options';
      this.dialogueKey += '.text';

      this.options = options;
      // TODO: grab callbacks from js file
      if (optionsAreCallbacks) {
        options.forEach(option => {
          let callback = getNestedKey(CALLBACKS, option);
            this.optionsCallbacks.push(
              callback ? ()=> { callback(this.scene) } : ()=>{}
            );
        });
      } else {
        options.forEach(option => {
          this.optionsCallbacks.push(
            ()=> { showMessage(this.scene, option); }
          )
        });
      }
    }
  }

  interact() {
    showMessage(
      this.scene, this.dialogueKey, this.manager, null, 
      { key: this.optionsKey, callbacks: this.optionsCallbacks }
    );
  }
}


class SoilPatch extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y, index) {
    super(scene, x, y, scene.registry.values.tileSize, scene.registry.values.tileSize);
    this.scene.add.existing(this);
    this.scene.allSprites.add(this);
    this.scene.physics.add.existing(this);
    this.scene.interactables.add(this);
    this.setOrigin(0);

    this.setFillStyle(0x000000, 0);

    this.index = index;  // refers to 1D index of arable Map

    this.fertilizationLevel = 0;

    // water level
    // Plants have to be watered regularly, watering increases the water by a certain value
    // as well as raining.
    // every day without rain decreases the water level by 1
    this.waterLevel = 0;

    this.crop = null;

    this.interactionButtonText = 'inspect';


    // define what happens on a new day
    this.scene.manager.events.on('newDay', ()=> {
      // TODO check for rain here?
      this.waterLevel = max(this.waterLevel - 1, 0);
      this.setFillStyle(0x000000, 0);
    });
  }

  plantCrop(scene, group, cropX, cropY, name, index) {
    // keep a reference to the crop sprite
    this.crop = new Crop(scene, group, cropX, cropY, name, index);
  }

  reset() {
    this.fertilizationLevel = 0;
    this.crop = null;
    this.setFillStyle(0x000000, 0);
  }

  fertilize(level) {
    this.fertilizationLevel += level;
    this.setFillStyle(0x000000, this.fertilizationLevel * 0.2);
  }

  water(level) {
    this.waterLevel = Math.min(this.scene.registry.values.maxWateringLevel, this.waterLevel + level);
    let alpha = 0.5 * (this.waterLevel / this.scene.registry.values.maxWateringLevel);
    this.setFillStyle(0x000000, alpha);
  }

  interact() {
    if (this.crop) {
      this.crop.interact();
    } else {
      showMessage(this.scene, 'interactibles.soilPatch', this.manager);
    }
  }
}