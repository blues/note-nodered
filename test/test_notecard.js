class BufferReadWriter {
    readBuffer;
    readBufferIndex = 0;
    writeBuffer;
    writeBufferIndex = 0;

    constructor (readBufferSize = 0, writeBufferSize = 0){
        this.readBuffer = Buffer.alloc(readBufferSize);
        this.writeBuffer = Buffer.alloc(writeBufferSize);
    }

    read(numBytes){
        if(!numBytes){
            return this.readBuffer.slice(this.readBufferIndex);
        }

        var newIndex = this.readBufferIndex + numBytes;
        newIndex = (newIndex > this.readBuffer.length) ? this.readBuffer.length : newIndex;
        var slice = this.readBuffer.slice(this.readBufferIndex, newIndex);
        this.readBufferIndex = newIndex;

        return slice;
    }

    write(inputBuffer){
        var numBytes = inputBuffer.length;
        var newIndex = this.writeBufferIndex + numBytes;
        newIndex = (newIndex > this.writeBuffer.length) ? this.writeBuffer.length : newIndex;

        inputBuffer.copy(this.writeBuffer, this.writeBufferIndex);
        this.writeBufferIndex = newIndex;
    }

    reset(){
        this.readBufferIndex = 0;
        this.writeBufferIndex = 0;
        this.readBuffer.fill(0);
        this.writeBuffer.fill(0);
    }
}

class InMemTransactor {

    rw;
    isOpen = false;

    constructor(readWriter = new BufferReadWriter()){
        this.rw = readWriter;
    }


    async open() {
        this.isOpen = true;

    }

    async close() {
        this.isOpen = false;
    }


    async doTransaction(messageBuffer){
        if(!this.isOpen){
            throw new Error("Transactor is not open")
        }

        this.rw.write(messageBuffer);

        return(this.rw.read());

    }

    async reset(){
        if(!this.isOpen){
            throw new Error("Transactor is not open")
        }
        this.rw.reset();
    }
}




var assert = require('assert');

const notecard = require('../notecard/notecard.js');


describe('notecard', () =>  {
    describe('constructor', () =>  {
        
        it('should populate the transactor with transactor object', () => {
            const t = new InMemTransactor();
            let nc = new notecard.Notecard(t);

            assert.deepEqual(nc.transactor, t);
        });

    });

    describe('request', () => {
        const rw = new BufferReadWriter(0, 255);
        const nc = new notecard.Notecard(new InMemTransactor(rw));
        

        it('should return the expected response as a JSON object', async () => {
            rw.reset();
            const responseString = '{"usb":true,"connected":true,"status":"{normal}","storage":2,"time":1609548654}\r\n'
            rw.readBuffer = Buffer.from(responseString);

            const request = {req:"card.status"};

            const response = await nc.request(request);

            const expectedResponse = JSON.parse(responseString);

            assert.deepEqual(response, expectedResponse, 'Failed to return expected response from Notecard');

            

        });

        it('should write a terminating character at the end of the request', async () => {
            rw.reset();
            const requestStr = `{"req":"card.status"}`;
            //const length = requestStr.length;
            rw.readBuffer = Buffer.from('{}');

            var terminatorIndex = 0;
            // Test with String Input
            await nc.request(requestStr);
            terminatorIndex = rw.writeBufferIndex - 1;

            assert.strictEqual(rw.writeBuffer[terminatorIndex], 0x0a, 'Did not send a terminating character with string input');

            // Test with JSON object
            rw.reset();
            rw.readBuffer = Buffer.from('{}');

            const request = JSON.parse(requestStr);
            await nc.request(request);

            terminatorIndex = rw.writeBufferIndex - 1;
            assert.strictEqual(rw.writeBuffer[terminatorIndex], 0x0a, 'Did not send a terminating character with JSON input');
            
            
        });

        it('should permit use of JSON string requests and provide response as JSON string', async () => {
            rw.reset();
            const request = `{"req":"card.status"}`
            const responseString = '{"usb":true,"connected":true,"status":"{normal}","storage":2,"time":1609548654}'
            rw.readBuffer = Buffer.from(responseString + '\r\n');

            const response = await nc.request(request);

            assert.strictEqual(response, responseString, 'Did not return expected response');

        });

        


    });

    // describe('using real notecard', () => {
    //     const i2c = require('../notecard/i2c-transactor.js');
    //     const nc = new notecard.Notecard(new i2c.I2CTransactor());

    //     it('should make a real request!', async () => {
    //         const request = {req:"card.status"};
    //         const response = await nc.request(request);
    //         console.log(response);

    //     });

    // });


   

});



