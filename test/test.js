
var assert = require('assert');

const transactor = require('../notecard/bus-transactor.js');

//function createReadWriter(config={readBufferLength:1024,writeBufferLength:1024}){
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
        reset: function(){
            this.readBufferIndex = 0;
            this.writeBufferIndex = 0;
            this.readBuffer.fill(0);
            this.writeBuffer.fill(0);
        }

    };
    return rw;
}


describe('buffer readwriter', function() {
    describe('read', function() {
        var rw = createReadWriter();
        rw.readBuffer = Buffer.from("hello");
        it('should read values in buffer', async function(){
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

    describe('write', function() {
        var rw = createReadWriter();
        rw.writeBuffer = Buffer.alloc(255);
        it('should write values to writer buffer', async function(){
            var localBuffer = Buffer.from("hello");
            var numBytesWritten = await rw.write(localBuffer.length, localBuffer);
            assert.equal(numBytesWritten, localBuffer.length);
            assert.equal(rw.writeBuffer.toString('utf8', 0, numBytesWritten), "hello", "Expects equivalent string value of 'hello'")
        });
    });

});

describe('bus transactor', function() {
    describe('getAvailableBytes', function() {
        var rw = createReadWriter();
        rw.writeBuffer = Buffer.alloc(255);
        rw.writeBuffer[0] = 99;
        rw.writeBuffer[1] = 99;
        rw.readBuffer  = Buffer.from([0x0, 0x0]);

        

        it('should write [0,0] on to readwriter', async function() {
            var numBytes = await transactor.queryAvailableBytes(rw);
            assert.equal(rw.writeBuffer[0], 0, "First byte in write buffer should be 0");
            assert.equal(rw.writeBuffer[1], 0, "Second byte in write buffer should be 0");
        });

        it('should throw error if not enough bytes are written',  function (){
            rw.writeBufferIndex = rw.writeBuffer.length;
            var numBytes = 7
            //numBytes = ;
            assert.rejects(async () => await transactor.queryAvailableBytes(rw));

        });
    
  });
});