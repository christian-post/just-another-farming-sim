CALLBACKS = {
  dialogues: {
    doorYes: scene => {
      scene.manager.events.emit('newDay');
      scene.scene.stop('Dialogue');
      scene.scene.resume(scene.scene.key);
    },
    doorNo: scene => {
      scene.scene.stop('Dialogue');
      scene.scene.resume(scene.scene.key);
    }
  }
};