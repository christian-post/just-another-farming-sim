export const getNestedKey = function(json, key) {
  const [k, ...rest] = key instanceof Array ? key : key.split('.');
  if(rest.length === 0 || typeof json[k] === 'undefined' || json[k] === null)
    return json[k];
  return getNestedKey(json[k], rest);
}


export const deepcopy = function(object) {
  // deep copy of an object with JSON serialization
  return JSON.parse(JSON.stringify(object));
}


export const download = function(content, fileName, contentType) {
  // lets the user save data from the browser
  let a = document.createElement('a');
  let file = new Blob([content], {type: contentType});
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
}