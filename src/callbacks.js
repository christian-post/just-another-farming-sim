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
            }
        });
    },
    doorNo: scene => {
      scene.scene.stop('Dialogue');
      scene.scene.resume(scene.scene.key);
    }
  }
};