import { showMessage } from "./user-interface.js";

export const callbacks = {
  dialogues: {
    doorYes: scene => {
      scene.scene.stop('Dialogue');
      scene.scene.resume(scene.scene.key);
      scene.scene.run(
        'Transition', 
        {
          sceneFrom: scene, 
          sceneTo: scene, 
          callback: ()=> {
            scene.manager.events.emit('newDay');
            scene.manager.events.emit('staminaChange', scene.registry.values.maxStamina);
            }
        });
    },
    doorNo: scene => {
      scene.scene.stop('Dialogue');
      scene.scene.resume(scene.scene.key);
    }
  },
  selling: {
    // if an item isn't an ordinary inventory item, a callback is needed when selling to a vendor
    // selling callbacks return the selling price if the item is sold, and false if it can't be sold (criteria is not met)
    pig: (scene, animalData) => {
      console.log(animalData)
      if (animalData.weight >= animalData.slaughterWeight) {
        return Math.floor(animalData.weight * animalData.sellPrice);
      } else {
        return 0;
      }
    }
  },
  interaction: {
    // TODO: this whole thing is obsolete for now
    /*
    this is the corresponding object that goes into the tilemap data
    {
      "height":16,
      "id":2,
      "name":"trough_1",
      "properties":[
              {
              "name":"callbackKey",
              "type":"string",
              "value":"interaction.trough"
              },
              {
              "name":"callbackArgs",
              "type":"string",
              "value":"{\"animal\": \"pig\", \"barnID\": 0, \"index\": 0}"
              },
              {
              "name":"interactionText",
              "type":"string",
              "value":"fill"
              }],
      "rotation":0,
      "type":"interact",
      "visible":true,
      "width":32,
      "x":64,
      "y":1440
      },
    */

    trough: (scene, args) => {
      /* 
      args need:
        animal: animal name ("pig", "cow", etc.)
        barnID: ID number of the barn in the data manager,
        index: trough index, corresponds to data.buldings[barnID].troughs array
      */

      // check the barn data if feed is needed and what type of feed is necessary
      let barn = scene.manager.farmData.data.buildings[args.barnID];

      // trough data needs to be part of the barn data
      let trough = barn.troughs[args.index];
      if (trough.currentFill < trough.maxFill) {
        // TODO check if trough is full also in the ItemDisplay scene
        scene.scene.pause(scene.scene.key);
        scene.scene.run(
          'SpecificItemUseDisplay', 
          {
            requirements: {
              type: "feed", 
              animal: barn.animal
            },
            amount: 1,
            maxAmount: trough.maxFill,
            maxAmountMessage: 'interactibles.troughFull',
            onRemoveCallback: ()=> {
              // what happens when feed is removed
              // fill one feed portion into the trough (change the data as well)
              trough.currentFill++;
            }
          }
        );
      } else {
        // is full
        showMessage(scene, 'interactibles.troughFull');
      }
    }
  }
};