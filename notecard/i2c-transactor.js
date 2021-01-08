const I2C = require("i2c-bus");
const protocol = require('./bus-serial-protocol.js');


class I2CTransactor {
    static MAX_PAYLOAD_CHUNK_BYTES = 253;
    static MESSAGE_TERMINATOR = 0x0a;
    pollIntervalMs = 5;
    pollStartDelayMs = 20;

    address = 0x17;
    busNumber = 1;
    constructor(){
        //console.log('constructed transactor');
    }

    bus = null;

    get isOpen(){
        return(this.bus != null);
    }

    async open(){
        this.bus = await I2C.openPromisified(this.busNumber);
    }

    async ping(){
        var info = await this.bus.scan(this.address);
        return(info);
    }

    async close(){
        if (this.bus === null){
            return
        }
        await this.bus.close();
        this.bus = null;
        
    }

    async read(length, buffer){
        var info = await this.bus.i2cRead(this.address, length, buffer);
        return(info.bytesRead);
    }

    async write(length, buffer){
        var info = await this.bus.i2cWrite(this.address, length, buffer);
        return(info.bytesWritten);
    }

    async pollForAvailableBytes()
    {
        const max_poll_requests = 1000;
        var bytesAvailable = 0;
        var numPollRequests = 0;

        await timeout(this.pollStartDelayMs);
        
        while(numPollRequests++ < max_poll_requests){
            
            bytesAvailable = await protocol.queryAvailableBytes(this);
            if(bytesAvailable > 0){
                break;
            }
            await timeout(this.pollIntervalMs);
        }
        
        return bytesAvailable;
        

    }

    async doTransaction(messageBuffer){
        
        var response = Buffer.alloc(0);
        
        await protocol.sendRequest(this, messageBuffer, I2CTransactor.MAX_PAYLOAD_CHUNK_BYTES);

        var numBytes = await this.pollForAvailableBytes();

        if(numBytes === 0){
            throw new Error("Bytes not available on Notecard (maybe due to transaction timeout)");
        }

        var hasTerminator = false;
        var i = 0;
        for(i = 0; i< 5; i++){

            var r = await protocol.readResponse(this, numBytes, I2CTransactor.MAX_PAYLOAD_CHUNK_BYTES);
            response = Buffer.concat([response, r]);
            hasTerminator = r[r.length - 1] === I2CTransactor.MESSAGE_TERMINATOR;
            if(hasTerminator){
                return(response);
            }
            await timeout(2);
        }

        throw new Error("Unable to complete transaction");
        
    }

    async reset(){

        await protocol.reset(this, I2CTransactor.MAX_PAYLOAD_CHUNK_BYTES);

    }


    

    
    
}






module.exports = {I2CTransactor};


const timeout = require('util').promisify(setTimeout)

// function timeout(intervalMs){
//     return new PromiseRejectionEvent((resolve,reject) => setTimeout(resolve, intervalMs));
// }

