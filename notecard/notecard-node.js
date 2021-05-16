
const notecard = require('./notecard.js');
const uart = require('./uart-connector.js');
const i2c = require('./i2c-connector.js');

module.exports = function(RED) {
    "use strict";
  
    class NotecardConfigNode{
        
        constructor(config){
            RED.nodes.createNode(this, config);

            this.Config = config;

            this.Notecard = new notecard.Notecard();
            this.parseConfigForNotecardConnector(config);

            this.generateCloseListener();

            this.Notecard.Connect()


        }

        parseConfigForNotecardConnector(config){
            if(!('connector' in config))
                return;
            
            if(typeof config.connector === 'object'){
                this.Notecard.Connector = config.connector;
                return;
            }

            if(config.connector === 'uart'){
                if('baudrate' in config)
                    config.baudrate = parseInt(config.baudrate);

                this.Notecard.Connector = new uart.UartConnector(config);
                return;
            }

            if(config.connector === 'i2c'){
                if('address' in config)
                    config.address = parseInt(config.address);
                
                if('busNumber' in config)
                    config.busNumber = parseInt(config.busNumber);
                
                this.Notecard.Connector = new i2c.I2CConnector(config);
                return;
            }

            throw new Error('abc');
        }

        generateCloseListener() {
            this.on("close", () => {
                this.notecard.disconnect();
                this.Notecard.Disconnect();
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