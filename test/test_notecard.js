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
            const request = {req:"card.status"};
            rw.readBuffer = Buffer.from('{}');

            await nc.request(request);
            const requestLength = JSON.stringify(request).length;
            assert.strictEqual(rw.writeBuffer[requestLength], 0x0a, 'Did not send a terminating character');
        });

        


    });

    describe('using real notecard', () => {
        const i2c = require('../notecard/i2c-transactor.js');
        const nc = new notecard.Notecard(new i2c.I2CTransactor());

        it('should make a real request!', async () => {
            const request = {req:"card.status"};
            const response = await nc.request(request);
            console.log(response);

        });

    });


   

});



