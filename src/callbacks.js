CALLBACKS = {
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
  }
};