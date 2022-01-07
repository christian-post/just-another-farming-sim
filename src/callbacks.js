CALLBACKS = {
  dialogues: {
    doorYes: scene => {
      scene.scene.stop('Dialogue');
      scene.scene.resume(scene.scene.key);
      playTransition(scene, ()=> {
        scene.manager.events.emit('newDay');
      });
    },
    doorNo: scene => {
      scene.scene.stop('Dialogue');
      scene.scene.resume(scene.scene.key);
    }
  }
};