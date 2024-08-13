/**
 * String formatting for flags into its individual components
 * @param {number} flags
 * @param {number} bits
 * @returns {string}
 */
export function flagsComponents(flags, bits = 32){
  let components = '';
  for (let i = 0; i < bits; ++i){
    const mask = (1 << i);
    if ((flags & mask) == mask) {
      if (components.length === 0) {
        components = components.concat('0x', mask.toString(16));
      } else {
        components = components.concat(' | ', '0x', mask.toString(16));
      }
    }
  }
  return components;
}
