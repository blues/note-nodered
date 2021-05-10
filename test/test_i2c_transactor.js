
const isWin = process.platform === "win32";
if(isWin)
{
    return
}


var assert = require('assert');
const should = require('should');
const transactor = require('../notecard/i2c-transactor.js');

describe('i2ctransactor', () =>  {
    
    
    describe('constructor', () =>  {
        
        it('should have correct default values', function (){
           let t = new transactor.I2CTransactor();
           assert.strictEqual(t.address, 0x17);
           assert.strictEqual(t.busNumber, 1);
        });

        it('should have correct address when passed in as config', () => {
            const c = {address: 0x19};
            const t = new transactor.I2CTransactor(c);

            assert.strictEqual(t.address, c.address, "Address does not match provided configuration");
        });

        it('should have correct busNumber port when passed in as config', () => {
            const c = {busNumber: 5};
            const t = new transactor.I2CTransactor(c);

            assert.strictEqual(t.busNumber, c.busNumber, "Bus number does not match provided configuration");
        });


    });

    describe('open', () => {

        const i2c = new transactor.I2CTransactor();

        it('should open the port and be able to detect Notecard', async () => {
            await i2c.open();
            var address = null;
            address = await i2c.ping();
            await i2c.close();

            assert.notStrictEqual(address, null, 'Did not find Notecard')
        });

        it('should open the port and \'isOpen\' should be true', async () => {
            await i2c.open();
            var isOpen = i2c.isOpen;
            await i2c.close();

            assert.strictEqual(isOpen, true, 'I2C unexpected reported as closed');
            
        });

    });

    describe('close', () =>{
        const i2c = new transactor.I2CTransactor();
        
        it('should close the port and Notecard detection should fail', async () => {
            await i2c.open();
            var address = await i2c.ping();
            await i2c.close();
            assert.rejects( async () => {
                address = await i2c.ping();
            });
            
        });

        it('should close the port and \'isOpen\' should be false', async () => {
            await i2c.open();
            await i2c.close();

            assert.strictEqual(i2c.isOpen, false, 'I2C unexpected reported as open');
        });

        it('should execute without error if port is already closed', async () => {
            if(i2c.isOpen){
                await i2c.close();
            }

            await i2c.close();

        });
    });

    
    describe('doTransaction', () => {
        
        
        it('should respond to version request', async () => {
            const i2c = new transactor.I2CTransactor();

            await i2c.open();
            await i2c.reset();

            const message = Buffer.from('{"req":"card.version"}\n');

            const response = await i2c.doTransaction(message);

            await i2c.close();
            assert.ok(response.toString().includes('"name":"Blues Wireless Notecard"'));
        });

        it('should throw error if i2c channel is not open', async () => {
            const i2c = new transactor.I2CTransactor();
            try {
                const r = await i2c.doTransaction('random-input');

            }catch (err){
                assert.strictEqual(err, 'Transactor channel not open. Cannot communicate with Notecard');
                return
            }
            assert.fail('Expected error, but did not receive one');
        });

        context('adding large note to Notecard', () => {
            const i2c = new transactor.I2CTransactor();
            const cleanUpNotes = Buffer.from(`{"req":"file.delete","files":["data.qo"]}\n`);

            it('should return that one note has been added', async () => {
                await i2c.open();
                await i2c.doTransaction(Buffer.from('\n'));
                await i2c.reset();
                var r = await i2c.doTransaction(cleanUpNotes);
                

                await delayMs(10);

                const req = Buffer.from(JSON.stringify(largeNoteAddRequestJSON) + '\n');

                r = await i2c.doTransaction(req);
                const rStr = r.toString();

                rStr.should.startWith('{"err":"error adding note:');
            });
        });
            
    });

    describe('reset', () => {
        const i2c = new transactor.I2CTransactor();

        it('should clear bytes from device buffer', async () => {
            await i2c.open();

            const message = Buffer.from('{"req":"card.version"}\n');
            const buffer = Buffer.concat([Buffer.from([message.length]), message]);
            var numBytesWritten = await i2c.write(buffer.length, buffer);
            var numBytes = await i2c.pollForAvailableBytes();

            await i2c.reset();

            await i2c.write(2, Buffer.from([0,0]));
            var response = Buffer.alloc(2);
            await i2c.read(2, response);

            await i2c.close();
            
            assert.strictEqual(response[0], 0, 'There are still some bytes left on the device for read');

        });
    });

    

    describe('Static Properties', () => {
        it('should have expected values for constant static properties', () => {
            assert.strictEqual(transactor.I2CTransactor.MAX_PAYLOAD_CHUNK_BYTES, 253, 'Unexpected value for max payload chunk size');
            assert.strictEqual(transactor.I2CTransactor.MESSAGE_TERMINATOR, "\n".charCodeAt(0), 'Unexpected value for message terminator');
        });
    });


});


function delayMs(delay) {
    return new Promise(function(resolve) {
        setTimeout(resolve, delay);
    });
}



const largeNoteAddRequestJSON = {
    req: "note.add",
    body: {
        glossary: {
            title: "example glossary",
            GlossDiv: {
                title: "S",
                GlossList: {
                    GlossEntry: {
                        ID: "SGML",
                        SortAs: "SGML",
                        GlossTerm: "Standard Generalized Markup Language",
                        Acronym: "SGML",
                        Abbrev: "ISO 8879:1986",
                        GlossDef: {
                            para: "A meta-markup language, used to create markup languages such as DocBook.",
                            GlossSeeAlso: [
                                "GML",
                                "XML"
                            ]
                        },
                        "GlossSee": "markup"
                    }
                }
            }
        }
    }
}