wow.Guid.prototype.toString = function() {
  return `${this.low.toString(16)}:${this.high.toString(16)} (${this.hash.toString(16)})`;
};

wow.Guid.prototype.toJSON = function() {
  return this.toString();
};

export default true;
