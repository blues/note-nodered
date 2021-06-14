
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
            
            throw new Error(`Cannot instantiate with invalid connector type '${config.connector}'`);

        }

        generateCloseListener() {
            this.on("close", (done) => {
                this.Notecard.Disconnect().then(()=> done()).catch((err)=>done(err));
            });
        }

        
    }
    
    RED.nodes.registerType("notecard-config", NotecardConfigNode);
}