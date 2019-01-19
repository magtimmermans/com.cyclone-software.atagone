const Homey = require('homey');

class AtagOneApp extends Homey.App {
  
  onInit() {
    this.log(`${ Homey.manifest.id } V${Homey.manifest.version} is running...`);
  }
  
}

module.exports = AtagOneApp; 