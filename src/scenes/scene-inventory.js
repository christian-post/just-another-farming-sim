import * as Utils from '../utils.js';
import { showMessage } from '../user-interface.js';
import { callbacks } from '../callbacks.js';


export class InventoryManager extends Phaser.Scene {
  preload() {
    this.load.scenePlugin({
      key: 'rexuiplugin',
      url: this.registry.values.rexui_url,
      sceneKey: 'rexUI'
    });
  }

  create() {
    // add reference to game manager
    this.manager = this.scene.get('GameManager');

    this.keys = Utils.addKeysToScene(this, this.manager.keyMapping);

    // black transparent background for the clock UI
    const clockBG = this.rexUI.add.roundRectangle(
      48, 8, 64, 32, 8, 0x000000, 0.5
    )
      .setOrigin(0);
    
    // Action command positions
    const cmdPos = {
      inventory: {
        x: 190, 
        y: 8
      },
      interact: {
        x: 260, 
        y: 8
      },
      item1: {
          x: 330, 
          y: 8
        },
      item2: {
          x: 375, 
          y: 8
        }
    };

    let itemTextOffsetX = 36;
    let itemTextOffsetY = 30;

    this.selectedItemQuantities = {
      item1: this.add.text(
        cmdPos.item1.x + itemTextOffsetX, cmdPos.item1.y + itemTextOffsetY, '', 
        { color: '#fff', fontSize: '10px', fontFamily: this.registry.values.globalFontFamily }
      ).setOrigin(1).setDepth(2),
      item2: this.add.text(
        cmdPos.item2.x + itemTextOffsetX, cmdPos.item2.y + itemTextOffsetY, '', 
        { color: '#fff', fontSize: '10px', fontFamily: this.registry.values.globalFontFamily }
      ).setOrigin(1).setDepth(2)
    }

    // texts
    const fontStyle = { 
      color: '#fff', 
      fontSize: '10px', 
      fontFamily: this.registry.values.globalFontFamily,
      padding: { y: 2 }
    };

    const fontStyleDay = { 
      color: '#000', 
      fontSize: '10px', 
      fontFamily: this.registry.values.globalFontFamily,
      padding: { y: 2 }
    };

    const calenderPos = { x: 8, y: 8 };

    // background sprite for the calendar
    let calendarBG = this.add.image(calenderPos.x, calenderPos.y, 'calendarOverlay')
      .setOrigin(0);

    this.day = this.add.text(
      calendarBG.getCenter().x, calendarBG.getCenter().y, '1', fontStyleDay
    ).setOrigin(0.5);

    // clock
    const hours = this.registry.values.startingDaytime.hour.toString().padStart(2, '0');
    const minutes = this.registry.values.startingDaytime.minutes.toString().padStart(2, '0');

    this.clock = this.add.text(
      clockBG.getCenter().x + 10, clockBG.getCenter().y, 
      `${hours}:${minutes}`, 
      fontStyle
    ).setOrigin(0.5);

    // overlay sprite for the clock
    this.add.image(clockBG.x, clockBG.y, 'clockOverlay')
      .setOrigin(0);

    // visual overlays for the buttons
    this.add.image(
      cmdPos.inventory.x, 
      cmdPos.inventory.y, 
      'buttonOverlayLarge')
        .setOrigin(0);

    this.add.image(
      cmdPos.interact.x, 
      cmdPos.interact.y, 
      'buttonOverlayLarge')
        .setOrigin(0);

    this.add.image(
      cmdPos.inventory.x, 
      cmdPos.inventory.y, 
      'buttonOverlayLargeShadow')
        .setOrigin(0);

    this.add.image(
      cmdPos.interact.x, 
      cmdPos.interact.y, 
      'buttonOverlayLargeShadow')
        .setOrigin(0);

    this.add.image(
      cmdPos.item1.x, 
      cmdPos.item1.y, 
      'buttonOverlaySmall')
        .setOrigin(0);

    this.add.image(
      cmdPos.item2.x, 
      cmdPos.item2.y, 
      'buttonOverlaySmall')
        .setOrigin(0);

    this.add.image(
      cmdPos.item1.x, 
      cmdPos.item1.y, 
      'buttonOverlaySmallShadow')
        .setOrigin(0);

    this.add.image(
      cmdPos.item2.x, 
      cmdPos.item2.y, 
      'buttonOverlaySmallShadow')
        .setOrigin(0);

    // action buttons
    if (this.manager.getCurrentGameScene().pad) {
      const buttonOffsetX = 8;
      const buttonOffsetY = 28;

      this.buttonLabels = {
        item1: this.add.image(
          cmdPos.item1.x + buttonOffsetX, 
          cmdPos.item1.y + buttonOffsetY, 
          'gamepad-buttons',
          0
        ),
        item2: this.add.image(
          cmdPos.item2.x + buttonOffsetX, 
          cmdPos.item2.y + buttonOffsetY, 
          'gamepad-buttons',
          1
        ),
        inventory: this.add.image(
          cmdPos.inventory.x + buttonOffsetX, 
          cmdPos.inventory.y + buttonOffsetY, 
          'gamepad-buttons',
          3
        ),
        interact: this.add.image(
          cmdPos.interact.x + buttonOffsetX, 
          cmdPos.interact.y + buttonOffsetY, 
          'gamepad-buttons',
          2
        )
      }
    } else {
      const buttonOffsetX = 4;
      const buttonOffsetY = 19;

      this.buttonLabels = {
        item1: this.add.text(
          cmdPos.item1.x + buttonOffsetX, 
          cmdPos.item1.y + buttonOffsetY, 
          this.registry.values.keymap[this.keys.item1.keyCode],
          fontStyle
        ),
        item2: this.add.text(
          cmdPos.item2.x + buttonOffsetX, 
          cmdPos.item2.y + buttonOffsetY, 
          this.registry.values.keymap[this.keys.item2.keyCode], 
          fontStyle
        ),
        interact: this.add.text(
          cmdPos.interact.x + buttonOffsetX, 
          cmdPos.interact.y + buttonOffsetY, 
          this.registry.values.keymap[this.keys.interact.keyCode], 
          fontStyle
        ),
        inventory: this.add.text(
          cmdPos.inventory.x + buttonOffsetX, 
          cmdPos.inventory.y + buttonOffsetY, 
          this.registry.values.keymap[this.keys.inventory.keyCode], 
          fontStyle
        ),
      }
    }

    // text that shows what the current interaction is

    let textOffsetX = 34;
    let textOffsetY = 6;

    this.interactionText = this.add.text(
      cmdPos.interact.x + textOffsetX, 
      cmdPos.interact.y + textOffsetY,
      '', fontStyle
    ).setOrigin(0.5, 0);

    this.inventoryText = this.add.text(
      cmdPos.inventory.x + textOffsetX, 
      cmdPos.inventory.y + textOffsetY,
      'inventory', fontStyle
    ).setOrigin(0.5, 0);

    // stamina bar
    this.staminaBar = this.makeBar(15, 48, 0x00dd00);
    this.setBarValue(100);

    // overlay sprite for the stamina bar
    this.add.image(2, this.staminaBar.background.y + 3, 'staminaOverlay')
      .setOrigin(0, 0.5);


    // Inventory and Items
    this.inventorySize = 32;
    this.inventory = new Array(this.inventorySize).fill(null);
    this.itemSelected = {
      item1: null,      // the index this button points to
      item2: null
    };

    // references to the images that are shown on the action buttons
    // TODO: combine this with text and index to one object
    this.itemSelectedSprites = {
      item1: null,
      item2: null
    };

    this.itemMaxQuantity = 255;

    // events that change the UI contents
    this.manager.events.on('newDay', ()=> {
      this.day.setText(`${this.manager.day}`);
    }, this);

    // stamina bar changes fill and color
    this.manager.events.on('stamina-bar-change', value => {
      this.setBarValue(value);
    }, this);

    // stamina bar flashes when empty
    let staminaFlashTween = this.add.tween({
      targets: this.staminaBar.overlay,
      duration: 250,
      repeat: 2,
      yoyo: true,
      fillAlpha: 1
    })
      .pause();

    this.manager.events.on('staminaLow', ()=> {
      if (!staminaFlashTween.isPlaying()) {
        staminaFlashTween.play();
      }
    });

    // TODO: make one object that holds all text objects
    this.manager.events.on('changeButtonText', (button, string) => {
      switch(button) {
        case 'inventory':
          this.inventoryText.setText(string);
          break;
        case 'interact':
          this.interactionText.setText(string);
          break;
      }
      
    });

    this.manager.events.on('itemEquipped', button => {
      // check if an item is already there
      if (this.itemSelectedSprites[button]) {
        this.itemSelectedSprites[button].destroy();
        this.selectedItemQuantities[button].setText('');
      }

      const index = this.itemSelected[button];
      const item = this.inventory[index];
      if (item) {
        let x = cmdPos[button].x + 22;
        let y = cmdPos[button].y + 18; 
  
        // check if the same item is equipped on the other button
        let otherButton = button === 'item1' ? 'item2' : 'item1';
        if (this.itemSelected[otherButton] === index) {
          // swap the current item to the other button
          this.itemSelectedSprites[otherButton].destroy();
          this.selectedItemQuantities[otherButton].setText('');
        }

        // TODO: change this image when a new one is equipped?
        let image = this.add.image(x, y, item.spritesheet, item.frame).setOrigin(0.5, 0.75);
        image.setDepth(1);
        this.itemSelectedSprites[button] = image;
        this.selectedItemQuantities[button].setText(item.quantity);
      } else {
        this.itemSelectedSprites[button] = null;
      }
    });

    this.manager.events.on('itemConsumed', (item, button) => {
      // fires if a non-unique item is used
      item.quantity -= 1;
      if (item.quantity > 0) {
        this.selectedItemQuantities[button].setText(item.quantity);
      } else {
        this.removeItem(button);
        // remove the sprite from the action button
        this.equipItem(null, button);
        this.selectedItemQuantities[button].setText('');
      }
    });

    // changing the clock
    this.manager.events.on('setClock', data => {
      this.clock.setText(`${data.hour}:${data.minutes}`);
    }, this);

    // global item collection event
    this.manager.events.on('item-collected', item => {
      // add the item
      const index = this.addItem(item);
      // check if the item is equipped on one of the ation buttons and update
      if (index) {
        const button = this.getButtonName(index);
        if (button) {
          this.selectedItemQuantities[button].setText(this.getSelectedItem(button).quantity);
        }
      }
     
    });

    // event that removes an item
    this.manager.events.on('item-removed', (index, item, quantity) => {
      if (item.unique) {
        this.inventory[index] = null;
        const button = this.getButtonName(index);
        if (button) {
          this.itemSelectedSprites[button].destroy();
        }
      } else {
        item.quantity = Math.max(item.quantity - quantity, 0);

        if (item.quantity === 0) {
          this.inventory[index] = null;
        }

        // if the item is equipped to one of the buttons
        const button = this.getButtonName(index);
        if (button) {
          this.selectedItemQuantities[button].setText(this.getSelectedItem(button).quantity);
          if (item.quantity === 0) {
            this.itemSelectedSprites[button].destroy();
            this.itemSelected[button] = null;
            this.selectedItemQuantities[button].setText('');
          }
        }
      }
    });

    // debugging
    this.fpsInfo = this.add.text(
      2, 2, '', 
    { fontSize: '18px', fill: '#f00', stroke: '#f00', strokeThickness: 1 }
    )
      .setVisible(false)
      .setDataEnabled(true);

    this.registry.events.on('changedata-debug', (_, value) => {
      this.fpsInfo.setVisible(value);
    });
  }

  update() {
    if (this.registry.values.debug) {
      this.fpsInfo.setText(this.game.loop.actualFps.toFixed(0));
    }
  }

  getSelectedItem(button) {
    if (this.itemSelected) {
      return this.inventory[this.itemSelected[button]];
    } else {
      return null;
    }
  }

  isEquipped(name) {
    // checks if this item is equipped on any button
    let item1 = this.getSelectedItem('item1');
    let item2 = this.getSelectedItem('item2');
    return (item1 && item1.name === name) || (item2 && item2.name === name);
  }

  isEquippedType(type) {
    // checks if this item is equipped on any button
    let item1 = this.getSelectedItem('item1');
    let item2 = this.getSelectedItem('item2');
    return (item1 && item1.type === type) || (item2 && item2.type === type);
  }

  getAmount(item) {
    // looks for instances of this item and returns the total amount owned
    let total = 0;
    this.inventory.forEach(inventoryItem => {
      if (inventoryItem && inventoryItem.name === item.name) {
        if (item.unique) {
          total += 1;
        } else {
          total += inventoryItem.quantity;
        }
      }
    });
    return total;
  }

  getButtonName(index) {
    // checks if one of the two action buttons holds the index the index points to
    if (this.itemSelected.item1 === index) {
      return 'item1';
    } else if (this.itemSelected.item2 === index) {
      return 'item2';
    } else {
      return null;
    }
  }

  addItem(itemToAdd, quantity=null) {
    // adds an item to the inventory (and returns the index)
    // quantity is a modifier for the original item data quantity
    if (typeof itemToAdd === 'undefined') { console.warn('Item is undefined'); }

    itemToAdd = Utils.deepcopy(itemToAdd);

    if (quantity) {
      itemToAdd.quantity = quantity;
    }

    // check if this kind of item already exists
    let rest;

    if (!itemToAdd.unique) {
      for (let [index, item] of this.inventory.entries()) {
        if (item !== null && item.name === itemToAdd.name && item.type === itemToAdd.type) {
          if (item.quantity < this.itemMaxQuantity) {
            // add to the existing slot if the amount is lower than the allowed max. quantity
            rest = this.inventory[index].quantity + itemToAdd.quantity - this.itemMaxQuantity;
            this.inventory[index].quantity += itemToAdd.quantity - Math.max(0, rest);
  
            // check if rest remains, if so, look for the next slot and add the rest there
            if (rest > 0) {
              this.addItem(itemToAdd, rest);
            }
            return index;
          }
        }
      }
    }

    // if item wasn't found or it is unique, look for the first free slot
    for (let [index, item] of this.inventory.entries()) {
      if (item === null) {
        if (itemToAdd.unique || itemToAdd.quantity < this.itemMaxQuantity) {
          this.inventory[index] = itemToAdd;
        } else {
          // add 255 of the item to this slot
          let newItem = Utils.deepcopy(itemToAdd);
          newItem.quantity = this.itemMaxQuantity;
          this.inventory[index] = newItem;

          // check if rest remains, if so, look for the next slot and add the rest there
          rest = itemToAdd.quantity - this.itemMaxQuantity;
          if (rest > 0) {
            this.addItem(itemToAdd, rest);
          }
        }
        return index;
      }
    }

    // if this code is reached, the whole inventory is full
    console.log('inventory full!');
    return null;
  }

  equipItem(inventoryIndex, button) {
    // TODO: is an "event" necessary because this isn't communicated between scenes...
    this.itemSelected[button] = inventoryIndex;
    this.manager.events.emit('itemEquipped', button);
  }

  removeItem(button) {
    // removes the item from inventory that this button points to
    this.inventory[this.itemSelected[button]] = null;
  }

  makeBar(x, y, color) {
    let w = 64;
    let h = 8;
    return {
      background: this.add.rectangle(x, y, w, h, 0xaaaaaa, 0.75).setOrigin(0),
      bar: this.add.rectangle(x, y, w, h, color, 1).setOrigin(0),
      overlay: this.add.rectangle(x, y, w, h, 0xff0000, 0).setOrigin(0)  // this is only used for effects
    };
  }

  setBarValue(percentage) {
    // scale the bar
    this.tweens.add({
      targets: this.staminaBar.bar,
      scaleX: percentage / 100,
      duration: 500
    });

    if (percentage >= 80) {
      this.staminaBar.bar.setFillStyle(0x00ff00);
    } else if (percentage >= 60) {
      this.staminaBar.bar.setFillStyle(0x80ff00);
    } else if (percentage >= 40) {
      this.staminaBar.bar.setFillStyle(0xffff00);
    } else if (percentage >= 20) {
      this.staminaBar.bar.setFillStyle(0xff8000);
    } else {
      this.staminaBar.bar.setFillStyle(0xff0000);
    }
  }

  // flashStaminaBar() {
  //   console.log('tweening');
  //   this.add.tween({
  //     targets: this.staminaBar.background,
  //     duration: 500,
  //     // repeat: 2,
  //     yoyo: true,
  //     fillColor: 0xff0000,
  //     // fillAlpha: 1
  //   });
  // }
}


export class GenericInventoryDisplay extends Phaser.Scene {
  /*
  Generic Scene that is used as a parent for the player's inventory,
  shop inventories etc.
  */
  create(config) {
    /*
    config contains:
    x: 80,
    y: 48,
    width: 338,
    height: 184,
    sidebar: {
      x: 8,
      y: 64,
      width: 64,
      height: 160
    },
    inventoryWidth: 8,
    inventoryHeight: 6,
    cursor: {
      size: this.registry.values.tileSize,
      strokeSize: 1
      strokeColor: 0xff0000,
      strokeAlpha: 1
    },
    textStyles: {
      sidebar: Phaser.Types.GameObjects.Text.TextStyle,
      items: Phaser.Types.GameObjects.Text.TextStyle,
      bottomText: Phaser.Types.GameObjects.Text.TextStyle
    }
    */
    this.manager = this.scene.get('GameManager');

    this.textStyles = config.textStyles;

    // width and height of the transparent background
    let width = config.width;
    let height = config.height;

    this.background = this.add.rectangle(
      config.x + width * 0.5, 
      config.y + height * 0.5,
      width, 
      height, 
      0x000000, 
      0.75
    )
      .setDepth(-2);

    // Side bar (additional space to display items)
    this.sidebarBackground = this.add.rectangle(
      config.sidebar.x, config.sidebar.y,
      config.sidebar.width, config.sidebar.height, 
      0x000000, 0.75
    )
      .setDepth(-2)
      .setOrigin(0);
    
    this.numSidebarSlots = 6;  // TODO think about what to display here
    this.sidebarSlots = [];  // information about the position
    for (let i = 0; i < this.numSidebarSlots; i++) {
      let yMargin = this.sidebarBackground.height / (this.numSidebarSlots + 1)

      // empty sidebar slot
      this.sidebarSlots[i] = {
        x: this.sidebarBackground.getCenter().x,
        y: this.sidebarBackground.y + yMargin + i * yMargin,
        element: null
      };
    }

    // display items in inventory
    this.invElements = [];
    // when in the inventory, shows which item is selected with the cursor
    this.currentIndex = 0;
    // how many cells the inventory has (maybe increase during game?)
    this.inventoryDimensions = { w: config.inventoryWidth, h: config.inventoryHeight };
    this.inventorySize = this.inventoryDimensions.w * this.inventoryDimensions.h;
    // size of the single inventory cells in pixels
    this.cellSize = {
      w: this.background.width / (this.inventoryDimensions.w + 1),
      h: this.background.height / (this.inventoryDimensions.h + 1)
    };

    // make a rectangle that shows what item is selected
    let cursorPos = this.itemPositionFromIndex(this.currentIndex);
    this.cursor = this.add.rectangle(
      cursorPos.x, 
      cursorPos.y, 
      config.cursor.size, 
      config.cursor.size
    );
    this.cursor
      .setStrokeStyle(
        config.cursor.strokeSize, 
        config.cursor.strokeColor,
        config.cursor.strokeAlpha
        )
      .setOrigin(0)
      .setDepth(-1);

    // Text at the bottom that shows the currently selected item information
    this.currentItemText = this.add.text(
      this.background.x, 
      this.background.getBottomCenter().y - 8, 
      '',
      this.textStyles.bottom
    );
    this.currentItemText.setOrigin(0.5, 1);

    // Key and Button bindings
    this.buttonCallbacks = {
      inventory: this.inventoryButtonCallback.bind(this),
      interact: () => {
        let item = this.getItem(this.currentIndex);
        if (item) { 
          this.interactWithItem(item); 
        };
      },
      item1: this.item1ButtonCallback.bind(this),
      item2: this.item2ButtonCallback.bind(this),
      menu: this.menuButtonCallback.bind(this)
    }

    // bind keyboard functionality 
    this.manager.configureKeys(this);

    // Gamepad functionality
    this.manager.checkForGamepad(this);

    // update the elements on the first start and on wake
    this.events.on('create', () => {
      this.updateInventory();
      this.updateSidebar();
    });

    this.events.on('wake', () => {
      this.updateInventory();
      this.updateSidebar();
    });
  }

  update(_, delta) {
    // move the cursor
    let dir = Utils.getCursorDirections(this, this.registry.values.menuScrollDelay, delta);

    if (dir.x !== 0 || dir.y !== 0) {
      let increment = Utils.convertIndexTo1D(dir.x, dir.y, this.inventoryDimensions.w);
      this.currentIndex = (this.currentIndex + increment) % this.inventorySize;
      // wrap around
      if (this.currentIndex < 0) {
        this.currentIndex += this.inventorySize;
      }
      let cursorPos = this.itemPositionFromIndex(this.currentIndex);
      this.cursor.x = cursorPos.x;
      this.cursor.y = cursorPos.y;

      // update the text at the bottom
      let item = this.getItem(this.currentIndex);
      this.updateBottomText(item);
    }
  }

  item1ButtonCallback() {
    return;
  }

  item2ButtonCallback() {
    return;
  }

  inventoryButtonCallback() {
    // exit the inventory display
    this.scene.sleep(this.scene.key);
    this.scene.resume(this.manager.currentGameScene);
    // change the button text back
    this.manager.events.emit('changeButtonText', 'inventory', 'inventory');

    this.manager.toggleDaytimePause();
  }

  menuButtonCallback() {
    return;
  }

  interactWithItem(item) {
    return;
  }

  getItem(index) {
    return;
  }

  updateSidebar() {
    // defines how the elements in the sidebar are updated
    return;
  }

  updateInventory() {
    // defines how the elements in the main inventory are updated
    return;
  }

  updateBottomText(item) {
    // item: currently selected item
    // individual behaviour for child scene, to be overwritten if needed
    this.currentItemText.setText(item ? item.screenName : '');
  }

  addToSidebar(element, index) {
    // adds an element (container, image) to the sidebar
    if (index >= 0) {
      // if index is specified, put this element in that position
      // change the x and y coordinates to match the sidebar slot
      element.x = this.sidebarSlots[index].x;
      element.y = this.sidebarSlots[index].y;
      this.sidebarSlots[index].element = element;
    } else {
      // get first free index
      for (let i = 0; i < this.sidebarSlots.length; i++) {
        if (!this.sidebarSlots[i].element) {
          this.addToSidebar(element, i);
          break;
        }
      }
    }
  }

  itemPositionFromIndex(index) {
    // returns the 2D position on the inventory for a given index
    let pos = Utils.convertIndexTo2D(index, this.inventoryDimensions.w);
    let x = this.background.getTopLeft().x + pos.x * this.cellSize.w + this.cellSize.w / 2;
    let y = this.background.getTopLeft().y + pos.y * this.cellSize.h + this.cellSize.h / 2;
    return { x: x, y: y };
  }
}


export class InventoryDisplay extends GenericInventoryDisplay {
  create() {
    super.create({
      x: 80,
      y: 48,
      width: 338,
      height: 184,
      sidebar: {
        x: 8,
        y: 64,
        width: 64,
        height: 160
      },
      inventoryWidth: 8,
      inventoryHeight: 6,
      cursor: {
        size: 18,
        strokeSize: 2,
        strokeColor: 0xff0066,
        strokeAlpha: 0.7
      },
      textStyles: {
        sidebar: { color: '#fff', fontSize: '10px', fontFamily: this.registry.values.globalFontFamily },
        items: { color: '#fff', fontSize: '10px', fontFamily: this.registry.values.globalFontFamily },
        bottomText: { color: '#fff', fontSize: '12px', fontFamily: this.registry.values.globalFontFamily }
      }
    });

    // money display in the sidebar
    let moneySprite = this.add.image(-16, 0, 'inventory-items', 5);
    this.moneyText = this.add.text(
      moneySprite.getRightCenter().x + 2, moneySprite.getRightCenter().y, 
      this.registry.values.money, this.textStyles.sidebar
    ).setOrigin(0, 0.5);

    let moneyInformation = this.add.container(0, 0, [ moneySprite, this.moneyText ]);

    this.addToSidebar(moneyInformation);

    // event listener that changes the money text
    this.registry.events.on('changedata', (_, key, data)=> {
      if (key === 'money') {
        this.moneyText.setText(data);
      }
    });
  }

  item1ButtonCallback() {
    this.scene.get('InventoryManager').equipItem(this.currentIndex, 'item1');
  }

  item2ButtonCallback() {
    this.scene.get('InventoryManager').equipItem(this.currentIndex, 'item2');
  }

  interactWithItem(item) {
    showMessage(this, 'tooltips.' + item.tooltip, item);
  }

  getItem(index) {
    return this.scene.get('InventoryManager').inventory[index];
  }

  updateInventory() {
    // delete all old items
    this.invElements.forEach(elem => { elem.destroy(); });

    // get the item information from the inventory manager
    let items = this.scene.get('InventoryManager').inventory;

    items.forEach((item, index) => {
      if (item) {
        let itemPos = this.itemPositionFromIndex(index);

        // item sprite
        let img = this.add.image(itemPos.x, itemPos.y, item.spritesheet, item.frame).setOrigin(0);
        this.invElements.push(img);
        // item text(amount)
        let txt = this.add.text(
          itemPos.x + 8, itemPos.y + 12, item.quantity, 
          { 
            color: '#fff', 
            fontSize: '10px', 
            fontFamily: this.registry.values.globalFontFamily 
          }
        );
        this.invElements.push(txt);
      }
    });

    // get the name of the currently selected item if there is one
    this.updateBottomText(items[this.currentIndex]);

    // change the text on the button UI
    this.manager.events.emit('changeButtonText', 'interact', 'info');
    this.manager.events.emit('changeButtonText', 'inventory', 'exit');
  }
}


class ShopDisplayTemplate extends GenericInventoryDisplay {
  // Template for both types of shops (buying and selling)
  create(items) {
    // "items" is an array of objects, see items.json for properties
    this.items = items;
    super.create({
      x: 80,
      y: 48,
      width: 338,
      height: 184,
      sidebar: {
        x: 8,
        y: 64,
        width: 64,
        height: 160
      },
      inventoryWidth: 8,
      inventoryHeight: 6,
      cursor: {
        size: 18,
        strokeSize: 2,
        strokeColor: 0xff0066,
        strokeAlpha: 0.7
      },
      textStyles: {
        sidebar: { color: '#fff', fontSize: '10px', fontFamily: this.registry.values.globalFontFamily },
        items: { color: '#fff', fontSize: '10px', fontFamily: this.registry.values.globalFontFamily },
        bottomText: { color: '#fff', fontSize: '12px', fontFamily: this.registry.values.globalFontFamily }
      }
    });

    // money display in the sidebar
    let moneySprite = this.add.image(-16, 0, 'inventory-items', 5);
    this.moneyText = this.add.text(
      moneySprite.getRightCenter().x + 2, moneySprite.getRightCenter().y, 
      this.registry.values.money, this.textStyles.sidebar
    ).setOrigin(0, 0.5);

    let moneyInformation = this.add.container(0, 0, [ moneySprite, this.moneyText ]);

    this.addToSidebar(moneyInformation);
  }

  updateInventory() {
    // delete all old items
    this.invElements.forEach(elem => { elem.destroy(); });

    this.items.forEach((item, index) => {
      if (item) {
        let itemPos = this.itemPositionFromIndex(index);

        let img = this.add.image(itemPos.x, itemPos.y, item.spritesheet, item.frame)
          .setOrigin(0)
          .setDepth(2);
        this.invElements.push(img);
        let txt = this.add.text(itemPos.x + 8, itemPos.y + 12, item.quantity, this.textStyles.items)
          .setDepth(2);
        this.invElements.push(txt);
      }
    });

    this.updateBottomText(this.items[this.currentIndex])
  }

  inventoryButtonCallback() {
    showMessage(this, 'npc-dialogue.shopping.goodbye', null, ()=> {
      this.manager.events.emit('changeButtonText', 'inventory', 'inventory');
      this.scene.stop(this.scene.key);
      this.scene.run(this.manager.getCurrentGameScene());
    });
  }

  getItem(index) {
    return this.items[index];
  }

  showMoneyChange(text) {
    // set the money text in the sidebar
    this.moneyText.setText(this.registry.values.money);

    // creates a moving text object that indicates that the money amount has changed
    let rect = this.moneyText.getBounds();
    let textobj = this.add.text(rect.x + rect.width, rect.y + rect.height, text, this.textStyles.sidebar)
      .setOrigin(1, 0.5);
    this.tweens.add({
      targets: textobj,
      y: textobj.y + 16,
      alpha: 0,
      duration: 500,
      onComplete: (tween, targets)=> { targets[0].destroy(); }
    });
  }
}


export class ShopDisplayBuy extends ShopDisplayTemplate {
  create(items) {
    // here, items is an array of keys (like "tools.scytheL1")
    // this makes different shops easier to create

    // get the corresponding item objects from the json cache
    let itemObjects = [];
    let itemData = Utils.deepcopy(this.cache.json.get('itemData'));
    items.forEach(key => {
      itemObjects.push(Utils.getNestedKey(itemData, key));
    });

    super.create(itemObjects);
  }

  // Scene where you can buy items
  interactWithItem(item) {
    let currentFunds = this.registry.values.money;
    if (currentFunds >= item.buyPrice) {
      this.registry.set('money',  currentFunds - item.buyPrice);
      this.showMoneyChange('-' + item.buyPrice);
      
      // check if the item goes in the inventory
      if (item.inventory) {
        this.manager.events.emit('item-collected', item);
      } else {
        if (item.type === 'livestock') {
          this.manager.farmData.addAnimal(item.name, item, 0);
        }
      }

      // update the text at the bottom
      this.updateBottomText(item);

    } else {
      showMessage(this, 'npc-dialogue.shopping.insufficient-funds');
    }
  }

  updateBottomText(item) {
    if (item) {
      let ownedAmount;
      if (item.inventory) {
        // if it is an inventory item
        ownedAmount = this.scene.get('InventoryManager').getAmount(item);
        this.currentItemText.setText(`${item.screenName} : \$ ${item.buyPrice}\nIn inventory: ${ownedAmount}`);
      } else {
        if (item.type === 'livestock') {
          // TODO: placeholder
          // think about how the building is chosen where the animal is placed
          // this defines the amount shown on screen
          ownedAmount = this.manager.farmData.data.buildings[0].animals.length;  

          this.currentItemText.setText(`${item.screenName} : \$ ${item.buyPrice}\nOn the farm: ${ownedAmount}`);
        }
      }
      
    } else {
      this.currentItemText.setText('');
    }
  }
}


export class ShopDisplaySell extends ShopDisplayTemplate {
  create(acceptedItemTypes) {
    //  filter inventory for items that this vendor does not buy (by type)
    //  allow animals also to be sold
    // e.g. acceptedItemTypes = ['seed', 'tool']
    this.acceptedItemTypes = acceptedItemTypes;

    super.create(this.filterItems());
  }


  filterItems() {
    // returns an inventory that only contains the items with matching types
    // types are stored as strings in this.acceptedItemTypes

    let inventory = this.scene.get('InventoryManager').inventory;

    // append all objects from farm data manager
    inventory = inventory.concat(this.scene.get('GameManager').farmData.asInventory());

    // return inventory.map(
    //   item => {
    //     if (item && this.acceptedItemTypes.includes(item.type)) {
    //       return item;
    //     }
    //     return null;
    //   }
    // );
    return inventory.filter(
      item => {
        return (item && this.acceptedItemTypes.includes(item.type));
      }
    )
  }


  updateInventory() {
    // delete all old item sprites
    this.invElements.forEach(elem => elem.destroy());

    // filter the inventory again
    this.items = this.filterItems();

    this.items.forEach((item, index) => {
      if (item) {
        let itemPos = this.itemPositionFromIndex(index);

        let img = this.add.image(itemPos.x, itemPos.y, item.spritesheet, item.frame)
          .setOrigin(0)
          .setDepth(2);
        this.invElements.push(img);
        let txt = this.add.text(itemPos.x + 8, itemPos.y + 12, item.quantity, this.textStyles.items)
          .setDepth(2);
        this.invElements.push(txt);
      }
    });

    this.updateBottomText(this.items[this.currentIndex])
  }


  interactWithItem(item) {
    // this is where you can sell your inventory items
    let currentFunds = this.registry.values.money;
    let sellPrice;

    if (item.inventory) {
      // determine the amount that can be sold
      let soldAmount;
      if (item.unique) {
        soldAmount = 1;
      } else if (item.quantity > item.sellQuantity) {
        soldAmount = item.sellQuantity;
      } else {
        soldAmount = item.quantity;
      }

      sellPrice = soldAmount * item.sellPrice;
      this.registry.set('money',  currentFunds + sellPrice);
      this.showMoneyChange('+' + sellPrice);

      this.manager.events.emit('item-removed', this.currentIndex, item, soldAmount);
    } else {
      // farm data object
      if (item.type === 'livestock') {

        // check if the animal can be sold
        sellPrice = callbacks.selling[item.name](this, item);
        if (sellPrice > 0) {
          this.registry.set('money',  currentFunds + sellPrice);
          this.showMoneyChange('+' + sellPrice);
          this.manager.farmData.removeAnimal(item.name, item.id);
        } else {
          // not ready to sell
          showMessage(this, 'npc-dialogue.shopping.animalNoSell');
        }
      }
    }

    // reconstruct inventory
    this.updateInventory();
  }

  updateBottomText(item) {
    if (item) {
      let ownedAmount = this.scene.get('InventoryManager').getAmount(item);
      this.currentItemText.setText(`${item.screenName} : \$ ${item.sellPrice}\nIn inventory: ${ownedAmount}`);
    } else {
      this.currentItemText.setText('');
    }
  }
}


export class SpecificItemUseDisplay extends ShopDisplayTemplate {
  /*
  This scene pops up when you have to use items of a specified quality.
  E.g. put a kind of feed in a trough.

  TODO: This class is unused ATM
  */
  create(config) {
    /* config contains
      requirements: object
      amount (optional): integer
      maxAmount (optional): integer
      maxAmountMessage (optional): string (is shown when max amount is reached)
      onRemoveCallback (optional): function is called when an item is removed
    */
   
    // pass the player's inventory to the parent scene
    super.create(this.scene.get('InventoryManager').inventory);

    // store the requirements for the item from the config
    this.requirements = config.requirements;
    this.amountToRemove = config.amount || 1;  // if amount is undefined, fall back to 1
    this.amountRemoved = 0;  // counts how many of the items have been removed
    // TODO: this might need to be an object in case multiple items can be used
    this.maxAmount = config.maxAmount || Infinity;
    this.maxAmountMessage = config.maxAmountMessage || 'general.item-no-action';

    this.onRemoveCallback = config.onRemoveCallback || null;
  }

  interactWithItem(item) {
    // check if it meets all the requirements
    for (const [key, value] of Object.entries(this.requirements)) {
      if (item[key] !== value) {
        showMessage(this, 'general.item-no-action');
        return;
      }
    }

    if (this.amountRemoved < this.maxAmount) {
      // all requirements have been met
      this.manager.events.emit('item-removed', this.currentIndex, item, this.amountToRemove);

      this.amountRemoved++;

      if (this.onRemoveCallback) {
        this.onRemoveCallback();
      }

      // reconstruct inventory
      this.updateInventory();
    } else {
      showMessage(this, this.maxAmountMessage);
    }
    
    // TODO: emit another event specific to this scene?
  }

  inventoryButtonCallback() {
    this.manager.events.emit('changeButtonText', 'inventory', 'inventory');
    this.scene.stop(this.scene.key);
    this.scene.run(this.manager.getCurrentGameScene());
  }
}