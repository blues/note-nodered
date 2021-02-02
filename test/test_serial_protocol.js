
var assert = require('assert');

const protocol = require('../notecard/bus-serial-protocol.js');

const sinon = require('sinon');

function createReadWriter(){
    var rw = {
        readBuffer: Buffer.from(""), //Buffer.alloc(config.readBufferLength),
        readBufferIndex:0, 
        writeBuffer: Buffer.from(""), //Buffer.alloc(config.writeBufferLength),
        writeBufferIndex:0,
        read: async function (numBytes, outputBuffer){
            var availableBytes = this.readBuffer.length - this.readBufferIndex;
            
            numBytes = (numBytes > availableBytes) ? availableBytes : numBytes;

            this.readBuffer.copy(outputBuffer, 0, this.readBufferIndex, this.readBufferIndex + numBytes);
            this.readBufferIndex += numBytes
            
            return numBytes;

        },

        write: async function (numBytes, inputBuffer){
            var availableBytes = this.writeBuffer.length - this.writeBufferIndex;
            numBytes = (numBytes > availableBytes) ? availableBytes : numBytes;

            inputBuffer.copy(this.writeBuffer, this.writeBufferIndex, 0, numBytes);
            this.writeBufferIndex += numBytes;

            return numBytes;
        },
        reset: function() {
            this.readBufferIndex = 0;
            this.writeBufferIndex = 0;
            this.readBuffer.fill(0);
            this.writeBuffer.fill(0);
        }

    };
    return rw;
}

function createPromise(handler){
    var resolve, reject;
  
    var promise = new Promise(function(_resolve, _reject){
      resolve = _resolve; 
      reject = _reject;
      if(handler) handler(resolve, reject);
    })
    
    promise.resolve = resolve;
    promise.reject = reject;
    return promise;
}


describe('buffer readwriter', () =>  {
    describe('read', () =>  {
        var rw = createReadWriter();
        rw.readBuffer = Buffer.from("hello");
        it('should read values in buffer', async () => {
            var localBuffer = Buffer.alloc(255);
            var numBytesRead = await rw.read(5, localBuffer)
            assert.equal(numBytesRead, 5, "Expects to read 5 bytes");
            assert.strictEqual(localBuffer.toString('utf8', 0, numBytesRead), "hello",  "Expects equivalent string value of 'hello'");
            
        });
        it('should read subset of values sequentially', async function (){
            rw.readBufferIndex = 0;
            var localBuffer = Buffer.alloc(2);
            var numBytesRead = await rw.read(2, localBuffer);
            assert.equal(numBytesRead, 2, "Expects to read 2 bytes");
            assert.equal(localBuffer.toString(), "he");

            numBytesRead = await rw.read(2, localBuffer);
            assert.equal(numBytesRead, 2, "Expects to read 2 bytes");
            assert.equal(localBuffer.toString(), "ll");

            numBytesRead = await rw.read(2, localBuffer);
            assert.equal(numBytesRead, 1, "Expects to read 1 remaining byte");
            assert.equal(localBuffer.toString('utf8', 0, 1), "o");
        });
    });

    describe('write', () =>  {
        var rw = createReadWriter();
        rw.writeBuffer = Buffer.alloc(255);
        it('should write values to writer buffer', async () => {
            var localBuffer = Buffer.from("hello");
            var numBytesWritten = await rw.write(localBuffer.length, localBuffer);
            assert.equal(numBytesWritten, localBuffer.length);
            assert.equal(rw.writeBuffer.toString('utf8', 0, numBytesWritten), "hello", "Expects equivalent string value of 'hello'")
        });
    });

});

describe('bus-serial-protocol', () =>  {
    describe('getAvailableBytes', () =>  {
        var rw = createReadWriter();
        rw.writeBuffer = Buffer.alloc(255);
        rw.writeBuffer[0] = 99;
        rw.writeBuffer[1] = 99;
        rw.readBuffer  = Buffer.from([0x0, 0x0]);

        

        it('should write [0,0] on to readwriter', async () =>  {
            var numBytes = await protocol.queryAvailableBytes(rw);
            assert.equal(rw.writeBuffer[0], 0, "First byte in write buffer should be 0");
            assert.equal(rw.writeBuffer[1], 0, "Second byte in write buffer should be 0");
        });

        it('should throw error if not enough bytes are written',  async function (){
            rw.writeBufferIndex = rw.writeBuffer.length;
            var numBytes = 7
            //numBytes = ;
            await assert.rejects(async () => await protocol.queryAvailableBytes(rw));

        });

        it('should return number bytes available to read - zero', async () =>  {
            rw.reset();
            var numBytes = await protocol.queryAvailableBytes(rw);
            assert.equal(numBytes, 0, 'Expect 0 bytes, if first byte in read buffer is zero');
        });

        it('should return number of bytes available to read - non-zero', async () =>  {
            rw.reset();
            rw.readBuffer[0] = 13;

            var numBytes = await protocol.queryAvailableBytes(rw);
            assert.equal(numBytes, 13, 'Expect 13 bytes to be available to read');
        });

        it('should throw error if number of bytes in read payload is non-zero', async () => {
            rw.reset();
            rw.readBuffer[1] = 17;
            await assert.rejects(async () => {await protocol.queryAvailableBytes(rw)},
            (err) => {
              assert.strictEqual(err.name, 'Error');
              assert.strictEqual(err.message, 'response payload size on query is non-zero');
              return true;
            });
        });

        it('should throw error if not enough bytes were read', async () => {
            rw.reset();
            rw.readBufferIndex = rw.readBuffer.length;
            await assert.rejects(async () => { await protocol.queryAvailableBytes(rw)}, 
            (err) => {
                assert.strictEqual(err.name, 'Error');
                assert.strictEqual(err.message, 'number of response bytes is fewer than 2');
                return true;
            })
        });

    
    });

    describe('sendRequest', () => {
        var rw = createReadWriter();
        rw.writeBuffer = Buffer.alloc(203);

        it('should write number of payload bytes sent as first byte', async () => {
            rw.reset();
            var payload = Buffer.from("my_payload");
            var payloadSize = payload.length;

            await protocol.sendRequest(rw, payload, payloadSize);

            assert.strictEqual(rw.writeBuffer[0], payload.length, 'Payload length not first byte in write buffer');
        });

        it('should write payload as single chunk if payload less than payload chunk size', async () => {
            rw.reset();
            var payload = Buffer.from("my_payload");
            var payloadSize = payload.length;

            await protocol.sendRequest(rw, payload, payloadSize);

            assert.strictEqual(rw.writeBuffer.slice(1,payload.length + 1).toString(), "my_payload", 'Payload value not in write buffer');
        });

        it('should write payload as multiple chunks if payload greater than chunk size', async () => {
            rw.reset();
            const payload = Buffer.from("my_payload");
            const PAYLOAD_REDUCTION = 3;
            const payloadSize = payload.length - PAYLOAD_REDUCTION;

            await protocol.sendRequest(rw, payload, payloadSize);

            var payloadBoundary = payloadSize + 1;
            assert.strictEqual(rw.writeBuffer[0], payloadSize, 'Initial chunk size is incorrect');
            assert.strictEqual(rw.writeBuffer.slice(1,payloadBoundary).toString(), "my_payl", 'First payload chunk not in write buffer');
            
            var writeBufferChunk = rw.writeBuffer.slice(payloadBoundary);
            assert.strictEqual(writeBufferChunk[0], PAYLOAD_REDUCTION, 'Second chunk size is incorrect');
            assert.strictEqual(writeBufferChunk.slice(1, PAYLOAD_REDUCTION + 1).toString(), "oad", "Second payload chunk is not written correctly");

        });

        it('should cancel write if a cancel is requested during sentRequest operation', async () => {
            var rwHoldWrite = createReadWriter();
            rwHoldWrite.writeBuffer = Buffer.alloc(203);
            

            var p = createPromise((r,e) => {});

            rwHoldWrite.write =  async function (numBytes, inputBuffer){
                
                await p;
                var availableBytes = this.writeBuffer.length - this.writeBufferIndex;
                numBytes = (numBytes > availableBytes) ? availableBytes : numBytes;
    
                inputBuffer.copy(this.writeBuffer, this.writeBufferIndex, 0, numBytes);
                this.writeBufferIndex += numBytes;
                
                return numBytes;
            };

            var canceller = {
                isCancelled: false,
                onCancel: () => {},
                cancel: () => {
                    canceller.isCancelled = true;
                    canceller.onCancel();
                }
            };


            var sender = protocol.sendRequest(rwHoldWrite, Buffer.from("my_payload"), 1, canceller);
            canceller.cancel();
            p.resolve("closing wait promise");

            await sender;

            assert.strictEqual(rwHoldWrite.writeBuffer[4], 0, "Expect no additional values written if cancelled")

        });

        it('should hold version request string just fine', async () => {
            rw.reset();
            var payload = Buffer.from('{"req":"card.version"}\n');
            var payloadSize = payload.length;

            await protocol.sendRequest(rw, payload, payloadSize);

            assert.strictEqual(rw.writeBuffer.slice(1,payload.length + 1).toString(), '{"req":"card.version"}\n', 'Payload value not in write buffer');

        })

        it('should call delay function if it is provided on function interface', async () => {
            rw.reset();
            var payload = Buffer.from('{"req":"card.version"}\n');
            var payloadSize = payload.length/2 + 1;

            const spy = sinon.spy();
            const delayFn = async () => {
                spy();
            }

            await protocol.sendRequest(rw, payload, payloadSize,{isCancelled:false}, delayFn);
            assert.ok(spy.calledOnce);


        });

    });

    describe('readResponse', () => {
        var rw = createReadWriter();
        rw.writeBuffer = Buffer.alloc(203);
        rw.readBuffer = Buffer.alloc(203);

        it('should write 0 as the first byte to the write buffer on read request', async () => {
            rw.reset();
            rw.writeBuffer[0] = 99;
            var numBytesAvailable = 1;
            var payloadSize = 3;

            await protocol.readResponse(rw, numBytesAvailable, payloadSize);

            assert.strictEqual(rw.writeBuffer[0], 0, 'Expect first element of write buffer to be 0 on read request')
        });

        it('should write number of bytes requested as the second byte to the write buffer on read request', async () => {
            rw.reset();
            rw.writeBuffer[1] = 99;
            var numBytesAvailable = 1;
            var payloadSize = numBytesAvailable + 3;

            await protocol.readResponse(rw, numBytesAvailable, payloadSize);

            assert.strictEqual(rw.writeBuffer[1], 1, 'Expect second element of write buffer to be number of bytes requested for send')
        });

        it('should return payload from read buffer', async () => {
            rw.reset();
            var payload = Buffer.from("my_payload");
            rw.readBuffer = Buffer.alloc(payload.length + 3);
            rw.readBuffer[0] = 0;
            rw.readBuffer[1] = payload.length;
            payload.copy(rw.readBuffer, 2);

            var numBytesAvailable = payload.length;
            var payloadSize = numBytesAvailable + 3;

            var response = await protocol.readResponse(rw, numBytesAvailable, payloadSize);

            assert.strictEqual(response.toString(), payload.toString(), 'Response expected to contain read buffer payload');

        });

        it('should return payload from read buffer response is larger than chunk size', async () => {
            rw.reset();
            var payload = Buffer.from("my_payload");
            var numBytesAvailable = payload.length;
            var payloadSize = numBytesAvailable - 1;

            // populate first chunk in read buffer
            var bytesSent = payloadSize;
            var remainingBytes = numBytesAvailable - bytesSent;
            rw.readBuffer = Buffer.alloc(payload.length + 5);
            rw.readBuffer[0] = remainingBytes;
            rw.readBuffer[1] = bytesSent;
            payload.copy(rw.readBuffer, 2);

            
            // populate second chunk in read buffer
            bytesSent = payload.length - payloadSize;
            remainingBytes = 0;

            var index = payloadSize + 2;
            var payloadSlice = payload.slice(payloadSize);

            rw.readBuffer[index++] = remainingBytes;
            rw.readBuffer[index++] = bytesSent;
            payloadSlice.copy(rw.readBuffer, index);
            

            var response = await protocol.readResponse(rw, numBytesAvailable, payloadSize);
            assert.strictEqual(rw.writeBufferIndex, 4, 'Write buffer not incremented to expected value');
            assert.strictEqual(rw.writeBuffer[0], 0, 'Write buffer expects read request byte');
            assert.strictEqual(rw.writeBuffer[1], payloadSize, 'Write buffer expects byte value of number of bytes to read in this request');
            assert.strictEqual(rw.writeBuffer[2], 0, 'Write buffer expects read request byte');
            assert.strictEqual(rw.writeBuffer[3], 1, 'Write buffer expects byte value of number of bytes to read in this request');
            
            assert.strictEqual(response.toString(), payload.toString(), 'Response expected to contain read buffer payload');

        });

        it('should cancel read  if a cancel is requested during readResponse operation', async () => {
            var rwHoldWrite = createReadWriter();
            rwHoldWrite.writeBuffer = Buffer.alloc(203);
            rwHoldWrite.readBuffer = Buffer.from([2, 1, 65, 1, 1, 65, 0, 1, 65])
            

            var p = createPromise((r,e) => {});

            rwHoldWrite.write =  async function (numBytes, inputBuffer){
                
                await p;
                var availableBytes = this.writeBuffer.length - this.writeBufferIndex;
                numBytes = (numBytes > availableBytes) ? availableBytes : numBytes;
    
                inputBuffer.copy(this.writeBuffer, this.writeBufferIndex, 0, numBytes);
                this.writeBufferIndex += numBytes;
                
                return numBytes;
            };

            var canceller = {
                isCancelled: false,
                onCancel: () => {},
                cancel: () => {
                    canceller.isCancelled = true;
                    canceller.onCancel();
                }
            };


            var reader = protocol.readResponse(rwHoldWrite, 11, 1, canceller);
            canceller.cancel();
            p.resolve("closing wait promise");

            await reader;

            assert.strictEqual(rwHoldWrite.writeBufferIndex, 2, "Expect no additional read request bytes in write buffer if cancelled")
        });

    });

    describe('reset', () => {
        var rw = createReadWriter();
        rw.writeBuffer = Buffer.alloc(255);
        rw.readBuffer = Buffer.alloc(255);

        var content = Buffer.from("a bunch of useless bytes\n that need to be flushed from buffer");
        var index = 0;
        var payloadSize = 11;
        var numIterations = content.length / payloadSize;
        var remainder = content.length;
    
        var i = 0;
        for(i = 0; i< numIterations; i++){
            rw.readBuffer[index++] = remainder;
            rw.readBuffer[index++] = payloadSize;
            content.copy(rw.readBuffer, index, 0, payloadSize);
            index += payloadSize;

            content = content.slice(payloadSize);
            remainder = content.length;
        }

        
        if(remainder > 0){
            rw.readBuffer[index++] = 0;
            rw.readBuffer[index++] = remainder;
            content.copy(rw.readBuffer, index, 0);
        }

        it('should flush the responses from the read buffer', async () => {
           
            rw.readBufferIndex = 0;
            await protocol.reset(rw, payloadSize);

            var numBytes = rw.readBuffer[rw.readBufferIndex];

            assert.equal(numBytes, 0, 'Number of bytes available for read is non-zero');

        });
    })
  
});



