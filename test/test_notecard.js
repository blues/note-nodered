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

class DelimitedBufferReadWriter extends BufferReadWriter{

    delimiter;

    constructor (readBufferSize = 0, writeBufferSize = 0, delimiter = '\r\n'){
        super(readBufferSize, writeBufferSize);
        this.delimiter = delimiter;
    }

    get delimiterLength() {
        return this.delimiter.length;
    }

    read(){
        if(this.readBufferIndex >= this.readBuffer.length){
            throw('Attempt to read data beyond scope of buffer');
        }

        var endIndex = this.readBuffer.length;
        const delimiterIndex = this.readBuffer.slice(this.readBufferIndex).indexOf(this.delimiter);
        if(delimiterIndex >= 0) {
            endIndex = this.readBufferIndex + delimiterIndex + this.delimiterLength;
        } 

        const slice = this.readBuffer.slice(this.readBufferIndex, endIndex);
        this.readBufferIndex = endIndex;

        return slice;
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
        
        beforeEach(function () {
            nc.transactor.open();
        });

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

    describe('request - multiple simultaneous requests', () => {
        const rw = new DelimitedBufferReadWriter(0, 255);
        const nc = new notecard.Notecard(new InMemTransactor(rw));
        nc.transactor.open();
        it('should return responses to correct requests', async () => {
            const request1 = '{"request":1}\n';
            const request2 = '{"request":2}\n';

            const expectedResponse1 = '{"response":1}';
            const expectedResponse2 = '{"response":2}';
            
            rw.reset();
            const responseStr = expectedResponse1 + '\r\n' + expectedResponse2 + '\r\n';
            rw.readBuffer = Buffer.from(responseStr);

            const p1 = nc.request(request1);
            const p2 = nc.request(request2);
            
            const response2 = await p2;
            
            assert.strictEqual(response2, expectedResponse2);
            

        });
    });

    describe('connect', () => {
        it('should open transactor', async () => {
            const nc = new notecard.Notecard(new InMemTransactor());
            assert.strictEqual(nc.transactor.isOpen, false, 'Transactor should not be open prior to calling "connect" method');
            nc.connect();

            assert.strictEqual(nc.transactor.isOpen, true, 'Transactor isOpen flag not "true"');
        });

        it('should not fail if transactor is open already', async () => {
            const nc = new notecard.Notecard(new InMemTransactor());
            nc.transactor.open();

            nc.connect();
        });
        
    });

    describe('disconnect', () => {
        it('should close transactor', async () => {
            const nc = new notecard.Notecard(new InMemTransactor());
            nc.transactor.open();
            assert.ok(nc.transactor.isOpen, 'Transactor should be open prior to calling "disconnect" method');
            nc.disconnect();

            assert.ok(!nc.transactor.isOpen, 'Transactor isOpen flag not "false"');
        });

        it('should not fail if transactor is closed already', async () => {
            const nc = new notecard.Notecard(new InMemTransactor());
            nc.transactor.close();

            nc.disconnect();
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



