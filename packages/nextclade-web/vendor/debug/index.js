function debug() {
  return debug;
}
debug.log = debug;
debug.info = debug;
debug.warn = debug;
debug.error = debug;
debug.enabled = false;
debug.disable = () => {};
debug.enable = () => {};
debug.destroy = () => {};
module.exports = debug;
module.exports.default = debug;
