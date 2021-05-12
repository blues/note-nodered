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

class MockSocket {
    IsOpen = false;
    ReceivedData = [];
    _responseData = [];
    ResponseCount = 0;
    ReceiveCount = 0;
    constructor(isOpen = true){
        this.IsOpen = isOpen;
    }

    Open(){
        return new Promise(resolve =>{
            this.IsOpen = true;
            resolve();
        });
    }

    Close(){
        return new Promise(resolve => {
            this.IsOpen = false;
            resolve();
        });
    }

    AddResponse(data){
        this._responseData.push(data);
    }

    SendReceive(data){
        return new Promise((resolve, reject) => {
            if(!this.IsOpen)
                reject(new Error('Socket not open'));

            this.ReceivedData.push(data);
            this.ReceiveCount++;

            if(this.ResponseCount >= this._responseData.length)
                reject(new Error('No response data available'));

            const response = this._responseData[this.ResponseCount];
            this.ResponseCount++;
            resolve(response);
        });
    }

    Send(data){
        return new Promise((resolve, reject) => {
            if(!this.IsOpen)
                reject(new Error('Socket not open'));

            this.ReceivedData.push(data);
            this.ReceiveCount++;
            

            resolve();
        });
    }

}

class MockSocketWithReceiveDelay extends MockSocket {
    _delay = [];
    constructor(isOpen = true){
        super(isOpen);
    }

    AddDelay(d){
        this._delay.push(d);
    }

    SendReceive(data){
        return new Promise((resolve, reject) => {
            if(!this.IsOpen)
                reject(new Error('Socket not open'));


            if(this.ReceiveCount >= this._delay.length)
                reject(new Error('No delay duration available'));

            setTimeout(() => {

                if(this.ResponseCount >= this._responseData.length)
                    reject(new Error('No response data available'));

                
                const response = this._responseData[this.ResponseCount];
                this.ResponseCount++;
                resolve(response);
            }, this._delay[this.ReceiveCount]);
            
            this.ReceivedData.push(data);
            this.ReceiveCount++;


        });
    }
}

class MockSocketWithSendDelay extends MockSocket {
    _delay = [];
    constructor(isOpen = true){
        super(isOpen);
    }

    AddDelay(d){
        this._delay.push(d);
    }

    Send(data){
        return new Promise((resolve, reject) => {
            if(!this.IsOpen)
                reject(new Error('Socket not open'));


            if(this.ReceiveCount >= this._delay.length)
                reject(new Error('No delay duration available'));

            setTimeout(() => {
                this.ReceivedData.push(data);
                resolve();
            }, this._delay[this.ReceiveCount]);
            
            this.ReceiveCount++;


        });
    }
}

describe('MockSocket', () => {
    describe('Open', () => {
        it('should result in IsOpen returning true', async () => {
            const m = new MockSocket(false);
            m.IsOpen.should.be.false();

            await m.Open();

            m.IsOpen.should.be.true();
        });

        it('should still result IsOpen returning true if socket already open', async () => {
            const m = new MockSocket(true);
            m.IsOpen.should.be.true();

            await m.Open();

            m.IsOpen.should.be.true();
        });
    });

    describe('Close', () => {
        it('should result in IsOpen returning false, even if socket is already closed', async () => {
            const m = new MockSocket(true);
            m.IsOpen.should.be.true();

            await m.Close();

            m.IsOpen.should.be.false();

            await m.Close();

            m.IsOpen.should.be.false();
        })
    });

    describe('AddResponse', () => {
        it('should append input argument to response array', () => {
            const m = new MockSocket()
            const r1 = `abcdef`;
            m.AddResponse(r1);
            m._responseData[0].should.equal(r1);

            const r2 = `qrstuv`;
            m.AddResponse(r2);
            m._responseData[1].should.equal(r2);
        });
    });

    describe('Send', () => {
        
        it('should append the ReceivedData property to whatever was sent', async () => {
            const m = new MockSocket();
            const d1 = 'abcdefg';
            await m.Send(d1);
            m.ReceivedData[0].should.equal(d1);

            const d2 = 'qrslkjsf';
            await m.Send(d2);
            m.ReceivedData[1].should.equal(d2);

        });

        it('should increment the ReceiveCount property', async () => {
            const m = new MockSocket();
            m.ReceiveCount.should.equal(0);

            await m.Send('random data');
            await m.Send('random data');
            m.ReceiveCount.should.equal(2);
            m.ResponseCount.should.equal(0);

        });
    });

    describe('SendReceive', () => {
        it('should append the ReceivedData property to whatever was sent', async () => {
            const m = new MockSocket();
            m.AddResponse(1);
            m.AddResponse(2);
            const d1 = 'abcdefg';
            await m.SendReceive(d1);
            m.ReceivedData[0].should.equal(d1);

            const d2 = 'qrslkjsf';
            await m.SendReceive(d2);
            m.ReceivedData[1].should.equal(d2);
        });

        it('should increment the ReceiveCount property', async () => {
            const m = new MockSocket();
            m.ReceiveCount.should.equal(0);
            m.AddResponse(1);
            m.AddResponse(2);

            await m.SendReceive('random data');
            await m.SendReceive('random data');
            m.ReceiveCount.should.equal(2);
        })

        it('should increment the ResponseCount property', async () => {
            const m = new MockSocket();
            m.ReceiveCount.should.equal(0);
            m.AddResponse(1);
            m.AddResponse(2);

            await m.SendReceive('random data');
            await m.SendReceive('random data');
            m.ResponseCount.should.equal(2);
        })

        it('should return data added by AddResponse method', async () => {
            const m = new MockSocket();
            const r1 = 'my-first-response';
            const r2 = 'my-second-response';
            m.AddResponse(r1);
            m.AddResponse(r2);

            let response = await m.SendReceive('some data');
            response.should.equal(r1);

            response = await m.SendReceive('some data');
            response.should.equal(r2);
        });

        it('should throw an error if no responses left to send as a reply', () => {
            const m = new MockSocket();
            
            return (m.SendReceive(`\n`)).should.be.rejectedWith({ message: 'No response data available' });
            
        });
    });
});


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

    describe('SendRequest', () => {
        context('single transaction', () => {
            it('should return the expected response as a JSON object', async () => {
                const nc = new notecard.Notecard();
                nc.Socket = new MockSocket();
                nc.Socket.AddResponse(`{"Iam":"here"}\n`)

                const request = {hello:"world"};
                const response = await nc.SendRequest(request);

                response.should.be.deepEqual({Iam:"here"});

            });

            it('should send the request over the Notecard socket as a string', async () => {
                const nc = new notecard.Notecard();
                nc.Socket = new MockSocket();
                nc.Socket.AddResponse(`{"Iam":"here"}\n`)

                const request = {hello:"world"};
                await nc.SendRequest(request);

                nc.Socket.ReceivedData[0].should.equal(`{"hello":"world"}\n`)
            })
        });

        context('multiple transactions', () => {
            it('should return responses to correct requests in correct order', async () => {
                const nc = new notecard.Notecard();
                nc.Socket = new MockSocketWithReceiveDelay();
                nc.Socket.AddResponse(`{"response1":1}\n`);
                nc.Socket.AddResponse(`{"response2":2}\n`);
                nc.Socket.AddDelay(20);
                nc.Socket.AddDelay(3);

                const r1 = nc.SendRequest({"request1":1});
                const r2 = nc.SendRequest({"request2":2});

                const response2 = await r2;
                const response1 = await r1;

                response1.should.deepEqual({"response1":1});
                response2.should.deepEqual({"response2":2});

            });
        });
    });

    describe('SendCommand', () => {
        context('single transaction', () => {

            it('should send the request over the Notecard socket as a string', async () => {
                const nc = new notecard.Notecard();
                nc.Socket = new MockSocket();

                const request = {hello:"world"};
                await nc.SendCommand(request);

                nc.Socket.ReceivedData[0].should.equal(`{"hello":"world"}\n`)
            })
        });

        context('multiple transactions', () => {
            it('should return responses to correct requests in correct order', async () => {
                const nc = new notecard.Notecard();
                nc.Socket = new MockSocketWithSendDelay();
                nc.Socket.AddDelay(20);
                nc.Socket.AddDelay(3);

                const r1 = nc.SendCommand({"command1":1});
                const r2 = nc.SendCommand({"command2":2});

                await r2;
                await r1;

                nc.Socket.ReceivedData[0].should.equal(`{"command1":1}\n`);
                nc.Socket.ReceivedData[1].should.equal(`{"command2":2}\n`);
                

            });
        });
    });

    describe('Connect', () => {
        it('should open the socket to the Notecard', async () => {
            const nc = new notecard.Notecard();
            nc.Socket = new MockSocket(false);
            nc.Socket.IsOpen.should.be.false();

            await nc.Connect();

            nc.Socket.IsOpen.should.be.true();

        });

        it('should throw expection if socket property is not populated', async () => {
            const nc = new notecard.Notecard();
            (nc.Socket === null).should.be.true();

            return (nc.Connect()).should.be.rejectedWith({ message: 'Socket not defined' });

        });
    });

    describe('Disconnect', () => {
        it('should close the socket to the Notecard', async () => {
            const nc = new notecard.Notecard();
            nc.Socket = new MockSocket(true);
            nc.Socket.IsOpen.should.be.true();

            await nc.Disconnect();

            nc.Socket.IsOpen.should.be.false();

        });

        it('should throw expection if socket property is not populated', async () => {
            const nc = new notecard.Notecard();
            (nc.Socket === null).should.be.true();

            return (nc.Disconnect()).should.be.rejectedWith({ message: 'Socket not defined' });

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



