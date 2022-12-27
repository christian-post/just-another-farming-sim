export const map = function(value, low1, high1, low2, high2) {
  // brings a value from an initial range (low1 - high1) to another range (low2 - high2)
  return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}


export const choose = function(choices){
  // returns a random element from a given array
  var index = Math.floor(Math.random() * choices.length);
  return choices[index];
}


export const sumArray = function(array) {
  // returns the sum of a given array
  return array.reduce((a, b) => { return a + b }, 0);
}


export const chooseWeighted = function(choices, weights) {
  // random choice from an array with weights for each element
  // https://blobfolio.com/2019/randomizing-weighted-choices-in-javascript/

  if (choices.length != weights.length) {
    console.warn(' Mismatching length of weights array! Returning random item instead.');
    return choose(choices);
  }

  let total = sumArray(weights);
  const threshold = Math.random() * total;

  total = 0;
  for (let i = 0; i < choices.length - 1; ++i) {
    // Add the weight to our running total.
    total += weights[i];

    // If this value falls within the threshold, we're done!
    if (total >= threshold) {
      return choices[i];
    }
  }
  // return the last item
  return choices[choices.length - 1];
}


const _boxMullerTransform = function() {
  // calculates the Box Muller Transformation (used for normally distributed sampling)
  // https://mika-s.github.io/javascript/random/normal-distributed/2019/05/15/generating-normally-distributed-random-numbers-in-javascript.html
  const u1 = Math.random();
  const u2 = Math.random();
  
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
  
  return { z0, z1 };
}


export const getNormallyDistributedRandomNumber = function(mean, stddev) {
  // returns a random value
  // when called repeatedly, return values will follow a normal distribution
  const { z0, _ } = _boxMullerTransform();
  return z0 * stddev + mean;
}


export const isNumeric = function(n) {
  // returns true if n is either of type int or float
  return !isNaN(parseFloat(n)) && isFinite(n); 
}


export const convertIndexTo1D = function(x, y, width) {
  // converts a 2D index to 1D
  return x + y * width;
}


export const convertIndexTo2D = function(index, width) {
  // converts a 1D index to 2D
  return {x: index % width, y: parseInt(index / width)};
}


const vec2 = function(x, y) {
  // wrapper for Vector2, because less typing ;)
  if (typeof x === 'object') {
    return new Phaser.Math.Vector2(x.x, x.y);
  } else {
    return new Phaser.Math.Vector2(x, y);
  }
}


export const simplifyPath = function(path) {
  // reduceds an array of Vector2s to the corner points
  // e.g.
  /*
  ####
     #       ######
     #       #
     ####    #
        ######

  becomes

  #..#
     .       #....#
     .       .
     #..#    .
        #....#   
  */
 
  // insert the first node 
  let newPath = [];
  newPath.push(vec2(path[0]));

  // iterate to all but the last node
  for (let i = 1; i< path.length - 1; i++) {
    let previous = path[i - 1];
    let current = path[i];
    let next = path[i + 1];
    // compare current node to previous and next
    if ((current.x !== previous.x || current.x !== next.x) && (current.y !== previous.y || current.y !== next.y)) {
      newPath.push(vec2(path[i]));
    }
  }
  // insert the end node
  newPath.push(vec2(path[path.length - 1]));

  return newPath;
}
