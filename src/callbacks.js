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
  enterHouse: scene => {
    scene.manager.switchScenes(
      scene.scene.key,
      'HouseInteriorScene',
      { 
        playerPos: { x: 160, y: 1570 },
        lastDir: scene.player.lastDir
      },
      true
    );
  },
  enterPigshed: scene => {
    scene.manager.switchScenes(
      scene.scene.key,
      'BarnInteriorScene',
      { 
        playerPos: { x: 132, y: 1540 },
        lastDir: scene.player.lastDir
      },
      true
    );
  }
};