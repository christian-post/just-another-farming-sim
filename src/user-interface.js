class DialogueScene extends Phaser.Scene {
  preload() {
    // Rex UI
    this.load.scenePlugin({
      key: 'rexuiplugin',
      url: URL_REXUI,
      sceneKey: 'rexUI'
    });
  }

  create(data) {
    this.manager = this.scene.get('GameManager');
    this.data = data;

    this.keys = addKeysToScene(this, this.manager.keyMapping);

    this.manager.checkForGamepad(this);  

    let json = this.cache.json.get('dialogue');
    let messageText = getNestedKey(json, data.key);
  
    if (!messageText) {
      console.log(`No matching text for "${data.key}"`);
      messageText = getNestedKey(json, 'error');
    }

    // format message text
    let formattedText = formatProperties(data.object, messageText);

    this.options = [];
    // if data has options, format and store that
    if (data.options.callbacks.length > 0) {
      let optionTexts = getNestedKey(json, data.options.key);
      optionTexts.forEach((text, index) => {
        this.options[index] = {
          text: formatProperties(data.object, text),
          callback: data.options.callbacks[index]
        };
      });
    }

    this.message = this.createMessage();
    this.message.start(formattedText, 50);

    this.cursor = null;

    if (this.options.length > 0) {
      this.optionPositions = [];
      this.currentOptionIndex = 0;
      // message contains options
      this.message.on('complete', ()=> {
        // change the action key text
        this.manager.events.emit('changeTextInteract', 'select');

        this.options.forEach( (option, index) => {

          let margin = this.message.width / (this.options.length + 1);
          let x = this.message.left + margin * (index + 1);
          let y = this.message.y + 24

          let text = this.add.text(
            x, y, option.text, 
            { 
              fontSize: '12px', 
              color: '#fff', 
              padding: { y: 2 }, 
              fontFamily: this.registry.values.globalFontFamily, 
            }
          ).setOrigin(0.5);

          this.optionPositions[index] = { x: text.getLeftCenter().x - 4, y: text.getLeftCenter().y };
        });
        
        this.cursor = this.add.image(
          this.optionPositions[this.currentOptionIndex].x, this.optionPositions[this.currentOptionIndex].y, 'ui-images', 0
        ).setOrigin(1, 0.5);
      });
    }

    this.buttonCallbacks = {
      interact: this.interactButtonCallback.bind(this),
      inventory: ()=> {
        this.message.destroy();
        this.manager.events.emit('changeTextInventory', 'inventory');
        if (this.data.callback) { this.data.callback(); }
      }
    };

    this.keys.interact.on('down', this.buttonCallbacks.interact, this);
    this.keys.inventory.on('down', this.buttonCallbacks.inventory, this);

    this.manager.events.emit('changeTextInventory', 'exit');

  }
  
  interactButtonCallback() {
    // when the message is still typing, show all text
    // when the message is complete, start next page or close if last page is reached
    if (this.message.isTyping) {
      this.message.stop(true);
    } else {
      if (this.cursor) {
        this.manager.scene.stop('Dialogue');  // TODO: does this always work?

        // change the text back
        this.manager.events.emit('changeTextInteract', '');
        this.manager.events.emit('changeTextInventory', 'inventory');

        // options and stuff
        this.options[this.currentOptionIndex].callback();
      } else {
        // normal text
        if (this.message.isLastPage) {
          this.message.destroy();
          this.manager.events.emit('changeTextInventory', 'inventory');
          if (this.data.callback) { this.data.callback(); }
        } else {
          this.message.typeNextPage();
        }
      } 
    }
  }

  update(time, delta) {
    if (this.cursor) {
      // move the cursor if the dialogue has options
      let dir = getCursorDirections(this, this.registry.values.menuScrollDelay, delta);
      if (dir.x !== 0) {
        if (dir.x > 0) {
          this.currentOptionIndex = (this.currentOptionIndex + 1) % this.options.length;
        } else {
          this.currentOptionIndex--;
          if (this.currentOptionIndex < 0) {
            this.currentOptionIndex = this.options.length - 1;
          }
        }
        this.cursor.setX(this.optionPositions[this.currentOptionIndex].x);
      }
    }
  }    

  createMessage() {
    let message = this.rexUI.add.textBox({
      x: this.registry.values.windowWidth * 0.5,
      y: this.registry.values.windowHeight * 0.75,
      height: this.registry.values.windowHeight * 0.2,
  
      background: this.rexUI.add.roundRectangle(0, 0, 2, 2, 20, 0x000000, 0.8),

      text: GetBBcodeText(
        this, 
        this.registry.values.windowWidth * 0.7, 
        this.registry.values.windowWidth * 0.7, 
        this.registry.values.windowHeight * 0.3, 
        12, 
        5
      ),

      page: { 
       maxLines: undefined,
       pageBreak: '\f\n',
      },
  
      space: {
        text: 10,

        left: 20,
        right: 20,
        top: 10,
        bottom: 10
      }
    });
    message.layout();
    message.popUp(200);

    return message;
  }
}

const GetBBcodeText = function(scene, wrapWidth, fixedWidth, fixedHeight, fontSize, maxLines) {
  return scene.rexUI.add.BBCodeText(0, 0, '', {
      fixedWidth: fixedWidth,
      fixedHeight: fixedHeight,

      fontFamily: scene.registry.values.globalFontFamily,

      fontSize: `${fontSize}px`,
      wrap: {
          mode: 'word',
          width: wrapWidth
      },
      maxLines: maxLines
  })
}

const showMessage = function(currentScene, key, object=null, onEndCallback=null, options=null) {
  // helper function that pauses the current scene and starts the dialogue scene with the give key
  // if another dialogue is running, quit that
  currentScene.scene.pause(currentScene.scene.key);
  currentScene.scene.run('Dialogue', {
    key: key, 
    callback: ()=> {
      currentScene.scene.stop('Dialogue');
      currentScene.scene.resume(currentScene.scene.key);
      if (onEndCallback) { onEndCallback(); };
    },
    // the object that the properties for string formatting belong to (default = GameManager)
    object: object || currentScene.manager,
    options: options || { key: '', callbacks: []}
  });
}


const formatProperties = function(object, string) {
  // gets a string and searches for elements in {brackets}
  // which should be properties of the object passed as first argument
  // used to make template strings possible in text files 
  //
  // example: 
  //    let obj = { foo: 'bar' }; 
  //    let message = 'The object\'s foo is {foo}.';
  //    console.log(formatProperties(obj, message));

  let re = /(\{.[^\{\}]*\})/g;
  let matches = string.match(re);

  if (!matches) {
    return string;
  }

  matches.forEach(elem => {
    let key = elem.replaceAll(/\{|\}/g, '');
    string = string.replace(elem, getNestedKey(object, key));
  });

  return string;
}


class GenericMenu extends Phaser.Scene {
  preload() {
    // Rex UI
    this.load.scenePlugin({
      key: 'rexuiplugin',
      url: URL_REXUI,
      sceneKey: 'rexUI'
    });
  }

  create(config) {
    /* config contains:
    x, y,     // screen positions
    height,   // defines the upper and lower bounds of the items
    background: {
      x, y, w, h, color, alpha
    },
    options: ['foo', 'bar'],
    callbacks: [function(){}, function(){}],
    fontStyle: TextStyle object
    */
    this.manager = this.scene.get('GameManager');
    
    this.currentOptionIndex = 0;

    if ('background' in config) {
      this.background = this.add.rectangle(
        config.background.x, config.background.y,
        config.background.w, config.background.h,
        config.background.color, config.background.alpha
      );
    }

    this.options = config.options;
    this.callbacks = config.callbacks;
    if (this.options.length !== this.callbacks.length) {
      console.warn('Mismatching number of options and callbacks.', this.options);
    }

    // set the position of options based on their number
    this.optionPositions = [];

    let fontStyle;
    if ('fontStyle' in config) {
      fontStyle = config.fontStyle;
    } else {
      fontStyle = { 
        fontSize: '12px', 
        color: '#fff', 
        padding: { y: 2 }, 
        fontFamily: this.registry.values.globalFontFamily, 
      };
    }

    let margin = config.height / (this.options.length + 1);

    for (let i = 0; i < this.options.length; i++) {
      let y = config.y + margin * i;
      let x = config.x;
      let text = this.add.text(x, y, this.options[i], fontStyle).setOrigin(0);

      this.optionPositions[i] = { x: text.getLeftCenter().x - 4, y: text.getLeftCenter().y };
    }

    this.cursor = this.add.image(
      this.optionPositions[this.currentOptionIndex].x, this.optionPositions[this.currentOptionIndex].y, 'ui-images', 0
    ).setOrigin(1, 0.5);

    // Button configuration
    this.keys = addKeysToScene(this, this.manager.keyMapping);
    this.manager.checkForGamepad(this);

    this.buttonCallbacks = {
      interact: ()=> {
        // select the current option
        if (this.callbacks[this.currentOptionIndex]) {
          this.scene.stop(this.scene.key);

          // change the text back
          this.manager.events.emit('changeTextInteract', '');
          this.manager.events.emit('changeTextInventory', 'inventory');

          // options and stuff
          this.callbacks[this.currentOptionIndex]();
        } else {
          console.warn('no callback for index ' + this.currentOptionIndex);
        }
      },
      inventory: ()=> {
        // exit the Menu preemptively
        this.scene.stop(this.scene.key);
        this.scene.resume(this.manager.currentGameScene);
        this.manager.events.emit('changeTextInventory', 'inventory');
      }
    };

    this.keys.interact.on('down', this.buttonCallbacks.interact, this);
    this.keys.inventory.on('down', this.buttonCallbacks.inventory, this);

    this.manager.events.emit('changeTextInventory', 'exit');
  }

  update(time, delta) {
    if (this.cursor) {
      // move the cursor
      let dir = getCursorDirections(this, this.registry.values.menuScrollDelay, delta);
      if (dir.y !== 0) {
        if (dir.y > 0) {
          this.currentOptionIndex = (this.currentOptionIndex + 1) % this.options.length;
        } else {
          this.currentOptionIndex--;
          if (this.currentOptionIndex < 0) {
            this.currentOptionIndex = this.options.length - 1;
          }
        }
        this.cursor.setY(this.optionPositions[this.currentOptionIndex].y);
      }
    }
  } 
}