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
