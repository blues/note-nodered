
var assert = require('assert');

const notecard = require('../notecard/notecard.js');


describe('notecard', () =>  {
    describe('constructor', () =>  {
        
        it('should do something', async function (){
           let nc = new notecard.Notecard();
        });
    });

    // describe('write', () =>  {
    //     var rw = createReadWriter();
    //     rw.writeBuffer = Buffer.alloc(255);
    //     it('should write values to writer buffer', async () => {
    //         var localBuffer = Buffer.from("hello");
    //         var numBytesWritten = await rw.write(localBuffer.length, localBuffer);
    //         assert.equal(numBytesWritten, localBuffer.length);
    //         assert.equal(rw.writeBuffer.toString('utf8', 0, numBytesWritten), "hello", "Expects equivalent string value of 'hello'")
    //     });
    // });

});



