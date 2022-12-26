export const toUTF16 = function(codePoint) {
  // converts unicode code points (hex values) to utf-16 surrogate pairs
  // used for emojis etc.
  // http://www.2ality.com/2013/09/javascript-unicode.html
  let TEN_BITS = parseInt('1111111111', 2);
  function u(codeUnit) {
    return '\\u'+codeUnit.toString(16).toUpperCase();
  }

  if (codePoint <= 0xFFFF) {
    return u(codePoint);
  }
  codePoint -= 0x10000;

  // Shift right to get to most significant 10 bits
  let leadSurrogate = 0xD800 + (codePoint >> 10);

  // Mask to get least significant 10 bits
  let tailSurrogate = 0xDC00 + (codePoint & TEN_BITS);

  return u(leadSurrogate) + u(tailSurrogate);
}


export const hexColor = function(number) {
  // takes a Number and converts it to a hexadecimal color string
  // e.g. 7970919 becomes '#79a067'
  return '#' + parseInt(number).toString(16);
}


const componentToHex = function(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}


export const rgbToHex = function(r, g, b) {
  // convert RGB values to a Hex color string
  // https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}


export const capitalize = function(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
