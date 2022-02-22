class InventoryManager extends Phaser.Scene {
  create() {
    // add reference to game manager
    this.manager = this.scene.get('GameManager');

    this.keys = addKeysToScene(this, this.manager.keyMapping);

    // TODO: placeholders, change to pixel art

    // black transparent background 
    // day
    const dayBG = this.add.rectangle(
      8, 8, 64, 32, 0x000000, 0.5
      ).setOrigin(0);

    // clock
    const clockBG = this.add.rectangle(
      80, 8, 64, 32, 0x000000, 0.5
    ).setOrigin(0);
    
    // Action button position
    const pos = {
      item1: {
          x: this.manager.registry.values.windowWidth - 48, 
          y: 8
        },
      item2: {
          x: this.manager.registry.values.windowWidth - 8, 
          y: 8
        },
      interact: {
          x: this.manager.registry.values.windowWidth - 88, 
          y: 8
        },
      inventory: {
          x: this.manager.registry.values.windowWidth - 152, 
          y: 8
        },
    };

    this.actionButtonSpots = {
      item1: this.add.rectangle(
          pos.item1.x, pos.item1.y, 32, 32, 0x000000, 0.5
          ).setOrigin(1, 0),
      item2: this.add.rectangle(
          pos.item2.x, pos.item2.y, 32, 32, 0x000000, 0.5
          ).setOrigin(1, 0),
      interact: this.add.rectangle(
        pos.interact.x, pos.interact.y, 56, 32, 0x000000, 0.5
          ).setOrigin(1, 0),
      inventory: this.add.rectangle(
        pos.inventory.x, pos.inventory.y, 56, 32, 0x000000, 0.5
          ).setOrigin(1, 0),
    };

    this.selectedItemQuantities = {
      item1: this.add.text(
        pos.item1.x - 2, pos.item1.y + 30, '', { color: '#fff', fontSize: '10px' }
      ).setOrigin(1).setDepth(2),
      item2: this.add.text(
        pos.item2.x - 2, pos.item2.y + 30, '', { color: '#fff', fontSize: '10px' }
      ).setOrigin(1).setDepth(2)
    }

    // texts
    const fontStyle = { 
      color: '#fff', 
      fontSize: '10px', 
      fontFamily: this.registry.values.globalFontFamily,
      padding: { y: 2 }
    };

    this.day = this.add.text(
      dayBG.getCenter().x, dayBG.getCenter().y, 'Day 1', fontStyle
    ).setOrigin(0.5);

    const hours = this.registry.values.startingDaytime.hour.toString().padStart(2, '0');
    const minutes = this.registry.values.startingDaytime.minutes.toString().padStart(2, '0');

    this.clock = this.add.text(
      clockBG.getCenter().x, clockBG.getCenter().y, 
      `${hours}:${minutes}`, 
      fontStyle
    ).setOrigin(0.5);

    // action buttons
    if (this.manager.getCurrentGameScene().pad) {
      const buttonOffsetX = 4;
      const buttonOffsetY = 28;

      this.buttonLabels = {
        item1: this.add.image(
          pos.item1.x - this.actionButtonSpots.item1.width + buttonOffsetX, 
          pos.item1.y + buttonOffsetY, 
          'gamepad-buttons',
          0
        ),
        item2: this.add.image(
          pos.item2.x - this.actionButtonSpots.item2.width + buttonOffsetX, 
          pos.item2.y + buttonOffsetY, 
          'gamepad-buttons',
          1
        ),
        inventory: this.add.image(
          pos.inventory.x - this.actionButtonSpots.inventory.width + buttonOffsetX, 
          pos.inventory.y + buttonOffsetY, 
          'gamepad-buttons',
          3
        ),
        interact: this.add.image(
          pos.interact.x - this.actionButtonSpots.interact.width + buttonOffsetX, 
          pos.interact.y + buttonOffsetY, 
          'gamepad-buttons',
          2
        )
      }
    } else {
      const buttonOffsetX = 0;
      const buttonOffsetY = 19;

      this.buttonLabels = {
        item1: this.add.text(
          pos.item1.x - this.actionButtonSpots.item1.width + buttonOffsetX, 
          pos.item1.y + buttonOffsetY, 
          this.registry.values.keymap[this.keys.item1.keyCode],
          fontStyle
        ),
        item2: this.add.text(
          pos.item2.x - this.actionButtonSpots.item2.width + buttonOffsetX, 
          pos.item2.y + buttonOffsetY, 
          this.registry.values.keymap[this.keys.item2.keyCode], 
          fontStyle
        ),
        interact: this.add.text(
          pos.interact.x - this.actionButtonSpots.interact.width + buttonOffsetX, 
          pos.interact.y + buttonOffsetY, 
          this.registry.values.keymap[this.keys.interact.keyCode], 
          fontStyle
        ),
        inventory: this.add.text(
          pos.inventory.x - this.actionButtonSpots.inventory.width + buttonOffsetX, 
          pos.inventory.y + buttonOffsetY, 
          this.registry.values.keymap[this.keys.inventory.keyCode], 
          fontStyle
        ),
      }
    }

    // text that shows what the current interaction is
    this.interactionText = this.add.text(
      this.actionButtonSpots.interact.getCenter().x, 
      this.actionButtonSpots.interact.getCenter().y,
      '', fontStyle
    ).setOrigin(0.5);

    this.inventoryText = this.add.text(
      this.actionButtonSpots.inventory.getCenter().x, 
      this.actionButtonSpots.inventory.getCenter().y,
      'inventory', fontStyle
    ).setOrigin(0.5);

    // stamina bar
    this.staminaBar = this.makeBar(8, 42, 0x00dd00);
    this.setBarValue(this.staminaBar, 100);


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
      this.day.setText(`Day ${this.manager.day}`);
    }, this);

    this.manager.events.on('stamina-change', value => {
      this.setBarValue(this.staminaBar, value);
    }, this);

    this.manager.events.on('changeTextInteract', string => {
      this.interactionText.setText(string);
    });

    this.manager.events.on('changeTextInventory', string => {
      this.inventoryText.setText(string);
    });

    this.events.on('itemEquipped', button => {
      // check if an item is already there
      if (this.itemSelectedSprites[button]) {
        this.itemSelectedSprites[button].destroy();
        this.selectedItemQuantities[button].setText('');
      }

      const index = this.itemSelected[button];
      const item = this.inventory[index];
      if (item) {
        let x = this.actionButtonSpots[button].getCenter().x;
        let y = this.actionButtonSpots[button].getCenter().y; 
  
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

    this.events.on('itemConsumed', (item, button) => {
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
    if (DEBUG) {
      this.fpsInfo = this.add.text(
        2, 2, '', 
      { fontSize: '18px', fill: '#f00', stroke: '#f00', strokeThickness: 1 }
      );
    }
  }

  update() {
    if (DEBUG) {
      this.fpsInfo.setText(this.game.loop.actualFps.toFixed(0));
    }
  }

  getSelectedItem(button) {
    return this.inventory[this.itemSelected[button]];
  }

  isEquipped(name) {
    // checks if this item is equipped on any button
    let item1 = this.getSelectedItem('item1');
    let item2 = this.getSelectedItem('item2');
    return (item1 && item1.name === name) || (item2 && item2.name === name);
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

    itemToAdd = deepcopy(itemToAdd);

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
          let newItem = deepcopy(itemToAdd);
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
    this.events.emit('itemEquipped', button);
  }

  removeItem(button) {
    // removes the item from inventory that this button points to
    this.inventory[this.itemSelected[button]] = null;
  }

  makeBar(x, y, color) {
    //draw the bar
    let bar = this.add.graphics();

    //color the bar
    bar.fillStyle(color, 1);

    //fill the bar with a rectangle
    bar.fillRect(0, 0, 64, 8);
    
    //position the bar
    bar.x = x;
    bar.y = y;

    //return the bar
    return bar;
  }

  setBarValue(bar, percentage) {
    //scale the bar
    bar.scaleX = percentage / 100;
  }
}


class InventoryDisplay extends Phaser.Scene {
  /*
  this scene is responsible for handling the display of the main inventory
  that shows up when  the player presses the "I" key
  it also pauses the main game scene
  */
  create() {
    this.manager = this.scene.get('GameManager');

    let width = 338;
    let height = 184;

    this.background = this.add.rectangle(
      80 + width * 0.5, 48 + height * 0.5,
      width, height, 
      0x000000, 0.75
    ).setDepth(-2);

    this.sidebarBackground = this.add.rectangle(
      8, 64,
      64, 160, 
      0x000000, 0.75
    )
      .setDepth(-2)
      .setOrigin(0);
    
    this.numSidebarSlots = 6;  // TODO think about what to display here
    this.sidebarSlots = [];

    this.fillSidebar();

    
    //display items in inventory
    this.invElements = [];
    // when in the inventory, shows which item is selected with the cursor
    this.currentIndex = 0;
    // how many cells the inventory has (maybe increase during game?)
    this.inventoryDimensions = { w: 8, h: 4 };
    // size of the single inventory cells in pixels
    this.cellSize = {
      w: this.background.width / (this.inventoryDimensions.w + 1),
      h: this.background.height / (this.inventoryDimensions.h + 1)
    };

    this.constructInventory();
    this.constructSidebar();

    this.events.on('wake', () => {
      // rebuild when the inventory is accessed
      // TODO: change so that the sprites are persistent, 
      //       but only the numbers and positions are updated?
      this.invElements.forEach(elem => {
        elem.destroy();
      });

      this.constructInventory();
      this.constructSidebar();
    });

    // Key and Button bindings
    this.buttonCallbacks = {
      inventory: ()=> {
        this.scene.sleep(this.scene.key);
        this.scene.resume(this.manager.currentGameScene);

        this.manager.events.emit('changeTextInventory', 'inventory');

        this.manager.toggleDaytimePause();
      },
      interact: () => {
        let item = this.scene.get('InventoryManager').inventory[this.currentIndex];
        if (item) { showMessage(this, 'tooltips.' + item.tooltip, item) };
      },
      item1: () => {
        this.scene.get('InventoryManager').equipItem(this.currentIndex, 'item1');
      },
      item2: () => {
        this.scene.get('InventoryManager').equipItem(this.currentIndex, 'item2');
      },
      menu: ()=> {}
    }
 
    // bind keyboard functionality 
    this.manager.configureKeys(this);

    // Gamepad functionality
    this.manager.checkForGamepad(this);
  }

  update(time, delta) {
    // move the cursor
    let dir = getCursorDirections(this, this.registry.values.menuScrollDelay, delta);

    if (dir.x !== 0 || dir.y !== 0) {
      let increment = convertIndexTo1D(dir.x, dir.y, this.inventoryDimensions.w);
      this.currentIndex = (this.currentIndex + increment) % this.scene.get('InventoryManager').inventorySize;
      // wrap around
      if (this.currentIndex < 0) {
        this.currentIndex += this.scene.get('InventoryManager').inventorySize;
      }
      let cursorPos = this.itemPositionFromIndex(this.currentIndex);
      this.cursor.x = cursorPos.x;
      this.cursor.y = cursorPos.y;

      // update the text at the buttom
      let item = this.scene.get('InventoryManager').inventory[this.currentIndex];
      this.currentItemText.setText(item ? item.screenName : '');
    }
  }

  constructInventory() {
    let items = this.scene.get('InventoryManager').inventory;
    items.forEach((item, index) => {
      if (item) {
        let itemPos = this.itemPositionFromIndex(index);

        let img = this.add.image(itemPos.x, itemPos.y, item.spritesheet, item.frame).setOrigin(0);
        this.invElements.push(img);
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

    // make a rectangle that shows what item is selected
    let cursorPos = this.itemPositionFromIndex(this.currentIndex);
    this.cursor = this.add.rectangle(
      cursorPos.x, 
      cursorPos.y, 
      this.registry.values.tileSize, 
      this.registry.values.tileSize
    );
    this.cursor
      .setStrokeStyle(1, 0xff0000, 1)
      .setOrigin(0)
      .setDepth(-1);
    this.invElements.push(this.cursor);

    // label that shows the name of the currently selected item

    // get the name of the currently selected item if there is one
    let screenName = items[this.currentIndex] ? items[this.currentIndex].screenName : '';

    this.currentItemText = this.add.text(
      this.background.x, 
      this.background.getBottomCenter().y - 8, 
      screenName,
      { 
        color: '#fff', 
        fontSize: '18px',
        fontFamily: this.registry.values.globalFontFamily 
      }
    );
    this.currentItemText.setOrigin(0.5, 1);
    this.invElements.push(this.currentItemText);

    // change the text on the button UI
    this.manager.events.emit('changeTextInteract', 'info');
    this.manager.events.emit('changeTextInventory', 'exit');
  }

  fillSidebar() {
    this.sidebarSlots = [];
    for (let i = 0; i < this.numSidebarSlots; i++) {
      let yMargin = this.sidebarBackground.height / (this.numSidebarSlots + 1)

      this.sidebarSlots[i] = {
        x: this.sidebarBackground.getCenter().x,
        y: this.sidebarBackground.y + yMargin + i * yMargin,
        element: null
      };
    }
  }

  addToSidebar(element, index) {
    if (index >= 0) {
      // if index is specified, put this element in that position
      // change the x and y coordinates to match the sidebar slot
      element.x = this.sidebarSlots[index].x;
      element.y = this.sidebarSlots[index].y;
      this.sidebarSlots[index].element = element;
      this.invElements.push(element);
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

  constructSidebar() {
    // reset sidebar
    this.fillSidebar();

    // money display
    let moneySprite = this.add.image(-16, 0, 'inventory-items', 5);
    let moneyText = this.add.text(
      moneySprite.getRightCenter().x + 2, moneySprite.getRightCenter().y, 
      this.registry.values.money, 
      { 
        color: '#fff', 
        fontSize: '10px',
        fontFamily: this.registry.values.globalFontFamily 
      }
    ).setOrigin(0, 0.5);
    // this.invElements.push(moneySprite);
    // this.invElements.push(moneyText);

    let moneyInformation = this.add.container(0, 0, [ moneySprite, moneyText ]);
    this.invElements.push(moneyInformation);

    this.addToSidebar(moneyInformation);

    if (DEBUG) {
      let bounds = moneyInformation.getBounds();
      bounds.x = moneyInformation.x;
      bounds.y = moneyInformation.y;
      this.add.rectangle(bounds.x, bounds.y, bounds.width, bounds.height, 
        0xFF0000, 0.5);
      
      // add elements just to test that the placement works correctly
      this.addToSidebar(this.add.image(0, 0, 'test-tile'));
      this.addToSidebar(this.add.image(0, 0, 'test-tile'), 3);
    }
  }


  itemPositionFromIndex(index) {
    // returns the 2D position on the inventory for a given index
    let pos = convertIndexTo2D(index, this.inventoryDimensions.w);
    let x = this.background.getTopLeft().x + pos.x * this.cellSize.w + this.cellSize.w / 2;
    let y = this.background.getTopLeft().y + pos.y * this.cellSize.h + this.cellSize.h / 2;
    return { x: x, y: y };
  }
}


class ShopDisplay extends Phaser.Scene {
  /*
  TODO docstring
  scene where you buy stuff
  */
  create(data) {
    this.data = data;
    this.manager = this.scene.get('GameManager');
    this.parentScene = data.parentScene;

    this.buttonCallbacks = {
      inventory: ()=> {
        showMessage(this, 'npc-dialogue.shopping.goodbye', null, ()=> {
          this.manager.events.emit('changeTextInventory', 'inventory');
          this.scene.stop(this.scene.key);
          this.scene.run(this.parentScene);
        });
      },
      interact: this.interactionButtonCallback.bind(this),
      item1: ()=> {},
      item2: ()=> {}
    };

    this.manager.configureKeys(this);
    this.manager.checkForGamepad(this);

    this.type = data.type;  // 'buy' or 'sell'

    let width = 338;
    let height = 184;

    this.background = this.add.rectangle(
      this.registry.values.windowWidth - 8, this.registry.values.windowHeight - 8,
      width, height, 
      0x000000, 0.75
    ).setOrigin(1);

    this.sidebarBackground = this.add.rectangle(
      8, 64,
      64, 32, 
      0x000000, 0.75
    )
      .setDepth(0)
      .setOrigin(0);

    this.textStyles = {
      sidebar: { color: '#fff', fontSize: '10px', fontFamily: this.registry.values.globalFontFamily },
      items: { color: '#fff', fontSize: '10px', fontFamily: this.registry.values.globalFontFamily },
      bottomText: { color: '#fff', fontSize: '12px', fontFamily: this.registry.values.globalFontFamily }
    };

    let moneySprite = this.add.image(-16, 0, 'inventory-items', 5);
    this.moneyText = this.add.text(
      moneySprite.getRightCenter().x + 2, moneySprite.getRightCenter().y, 
      this.registry.values.money, this.textStyles.sidebar
    ).setOrigin(0, 0.5);

    this.add.container(
      this.sidebarBackground.getCenter().x, 
      this.sidebarBackground.getCenter().y, 
      [ moneySprite, this.moneyText ]
    );

    // event listener that changes the money text
    this.registry.events.on('changedata', (parent, key, data)=> {
      if (key === 'money') {
        this.moneyText.setText(data);
      }
    });

    //display items in inventory
    this.invElements = [];

    this.currentIndex = 0;

    // maximum slots
    this.inventoryDimensions = { w: 8, h: 4 };
    this.inventorySize = this.inventoryDimensions.w * this.inventoryDimensions.h;

    this.cellSize = {
      w: this.background.width / (this.inventoryDimensions.w + 1),
      h: this.background.height / (this.inventoryDimensions.h + 1)
    };

    this.constructInventory();
  }

  interactionButtonCallback() {
    // buy that stuff
    let item = this.items[this.currentIndex];
    if (item) { 
      if (this.type === 'buy') {
        let currentFunds = this.registry.values.money;
        if (currentFunds >= item.buyPrice) {
          this.registry.set('money',  currentFunds - item.buyPrice);
          this.showMoneyChange('-' + item.buyPrice);
          this.manager.events.emit('item-collected', item);

          // update the text at the buttom
          this.currentItemText.setText(item ? this.getItemText(item) : '');

        } else {
          showMessage(this, 'npc-dialogue.shopping.insufficient-funds');
        }
      } else if (this.type === 'sell') {
        let currentFunds = this.registry.values.money;

        // determine the amount that can be sold
        let soldAmount;
        if (item.unique) {
          soldAmount = 1;
        } else if (item.quantity > item.sellQuantity) {
          soldAmount = item.sellQuantity;
        } else {
          soldAmount = item.quantity;
        }

        let sellPrice = soldAmount * item.sellPrice;

        this.registry.set('money',  currentFunds + sellPrice);
        this.showMoneyChange('+' + sellPrice);

        this.manager.events.emit('item-removed', this.currentIndex, item, soldAmount);

        // reconstruct inventory
        this.constructInventory();

          // update the text at the buttom
        //  this.currentItemText.setText(item ? this.getItemText(item) : '');
      }        
    }
  }

  constructInventory() {
    this.invElements.forEach(elem => { 
      elem.destroy(); 
    });
    this.invElements = [];

    this.items = [];

    // add the items
    // "data.items" is an array of keys that corresponds to objects in items.json
    if (this.type === 'buy') {
      let itemData = deepcopy(this.cache.json.get('itemData'));

      this.data.items.forEach((key, index) => {
        let item = getNestedKey(itemData, key);
        let itemPos = this.itemPositionFromIndex(index);
  
        let img = this.add.image(itemPos.x, itemPos.y, item.spritesheet, item.frame)
          .setOrigin(0)
          .setDepth(2);
        this.invElements.push(img);
        let txt = this.add.text(itemPos.x + 8, itemPos.y + 12, item.quantity, this.textStyles.items)
          .setDepth(2);
        this.invElements.push(txt);
  
        this.items.push(item);
      });
    } else if (this.type === 'sell') {
      let items = this.scene.get('InventoryManager').inventory;
      // push all the null values to the back
      items.sort();  
      items.forEach((item, index) => {
        // TODO: too much duplicate code
        if (item) {
          let itemPos = this.itemPositionFromIndex(index);
          let img = this.add.image(itemPos.x, itemPos.y, item.spritesheet, item.frame)
            .setOrigin(0)
            .setDepth(2);
          this.invElements.push(img);
          let txt = this.add.text(itemPos.x + 8, itemPos.y + 12, item.quantity, this.textStyles.items)
            .setDepth(2);
          this.invElements.push(txt);
    
          this.items.push(item);
        }
      });
    }

    // text that shows name and price
    this.currentItemText = this.add.text(
      this.background.getBottomCenter().x, 
      this.background.getBottomCenter().y - 8, 
      '',
      this.textStyles.bottomText
    );
    if (this.items[this.currentIndex]) {
      this.currentItemText.setText(this.getItemText(this.items[this.currentIndex]));
    }
    this.currentItemText.setOrigin(0.5, 1);
    this.invElements.push(this.currentItemText);

    // movable cursor
    let cursorPos = this.itemPositionFromIndex(this.currentIndex);
    this.cursor = this.add.rectangle(
      cursorPos.x, 
      cursorPos.y, 
      this.registry.values.tileSize, 
      this.registry.values.tileSize
    );
    this.cursor
      .setStrokeStyle(1, 0xff0000, 1)
      .setOrigin(0)
      .setDepth(1);
    this.invElements.push(this.cursor);
  }

  itemPositionFromIndex(index) {
    // returns the 2D position on the inventory for a given index
    let pos = convertIndexTo2D(index, this.inventoryDimensions.w);
    let x = this.background.getTopLeft().x + pos.x * this.cellSize.w + this.cellSize.w / 2;
    let y = this.background.getTopLeft().y + pos.y * this.cellSize.h + this.cellSize.h / 2;
    return {x: x, y: y};
  }

  getItemText(item) {
    let ownedAmount = this.scene.get('InventoryManager').getAmount(item);
    // TODO: check if the item is unique
    if (this.type === 'buy') {
      return `${item.screenName} : \$ ${item.buyPrice}\nIn inventory: ${ownedAmount}`;
    } else if (this.type === 'sell') {
    return `${item.screenName} : \$ ${item.sellPrice}\nIn inventory: ${ownedAmount}`;
    }
  }

  showMoneyChange(text) {
    // creates a moving text object that indicates that the money amount has changed
    // TODO: get screen position of text object
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

  update(time, delta) {
    // move the cursor
    let dir = getCursorDirections(this, this.registry.values.menuScrollDelay, delta);

    if (dir.x !== 0 || dir.y !== 0) {
      let increment = convertIndexTo1D(dir.x, dir.y, this.inventoryDimensions.w);
      this.currentIndex = (this.currentIndex + increment) % this.inventorySize;
      // wrap around
      if (this.currentIndex < 0) {
        this.currentIndex += this.inventorySize;
      }
      let cursorPos = this.itemPositionFromIndex(this.currentIndex);
      this.cursor.x = cursorPos.x;
      this.cursor.y = cursorPos.y;

      // update the text at the buttom
      let item = this.items[this.currentIndex];
      this.currentItemText.setText(item ? this.getItemText(item) : '');
    }
  }
}