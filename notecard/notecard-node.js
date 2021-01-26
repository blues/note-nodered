
const notecard = require('./notecard.js');
const transactor = require('./i2c-transactor.js')


const DEFAULT_I2C_BUS_NUMBER = 1;

const DEFAULT_NOTECARD_I2C_ADDRESS = 0x17;

module.exports = function(RED) {
    "use strict";
    
    class NotecardConfigNode {
        
        constructor(config){
            RED.nodes.createNode(this, config);

            const t = new transactor.I2CTransactor();
            this.notecard = new notecard.Notecard(t);

            var busNumber = parseInt(config.busno);
            if(isNaN(busNumber)){
                busNumber = DEFAULT_I2C_BUS_NUMBER
            }

            var address = parseInt(config.address);
            if(isNaN(address)){
                address = DEFAULT_NOTECARD_I2C_ADDRESS;
            }

            this.generateCloseListener();

            this.notecard.connect();
        }

        generateCloseListener() {
            this.on("close", () => {
                this.notecard.disconnect();
            });
        }

        async sendRequest(request) {
            
            const response = await this.notecard.request(request);
                
            return response; 
        }

        get busNumber() {
            return this.notecard.transactor.busNumber;
        }

        set busNumber(n) {
            this.notecard.transactor.busNumber = n;
        }

        get address() {
            return this.notecard.transactor.address;
        }

        set address(a) {
            this.notecard.transactor.address = a;
        }

        get transactor() {
            return this.notecard.transactor;
        }

        set transactor(t) {
            this.notecard.transactor = t;
        }
    }
    
    RED.nodes.registerType("notecard-config", NotecardConfigNode);
}