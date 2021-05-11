

var assert = require('assert');
const should = require('should');
const transactor = require('../notecard/uart-transactor.js');



describe('UartTransactor', () =>  {
    
    
    describe('constructor', () =>  {
        
        it('should have correct default values', function (){
           let t = new transactor.UartTransactor();
           assert.strictEqual(t.port, "");
           assert.strictEqual(t.baudrate, 9600);
        });

        it('should have correct port when passed in as config', () => {
            const c = {port: "portabc"};
            const t = new transactor.UartTransactor(c);

            assert.strictEqual(t.port, c.port, "Address does not match provided configuration");
        });

        it('should have correct baud rate when passed in as config', () => {
            const c = {baudrate: 5};
            const t = new transactor.UartTransactor(c);

            assert.strictEqual(t.baudrate, c.baudrate, "Bus number does not match provided configuration");
        });

    });

    describe('open', () =>{
        const uart = new transactor.UartTransactor({port:"COM4"});

        it('should open the port and \'isOpen\' should be true', async () => {
            await uart.open();
            var isOpen = uart.isOpen;
            await uart.close();

            assert.strictEqual(isOpen, true, 'UART reported as closed instead of open')
        })
    });

    describe('isOpen', () => {
        const uart = new transactor.UartTransactor({port:"COM4"});
        it('should return \'false\' if uart.open has not been called', () => {
            assert.strictEqual(uart.isOpen, false, 'isOpen unexpectedly returns true');
        });
    });

    describe('close', () => {
        const uart = new transactor.UartTransactor({port:"COM4"});
        it('should execute without error if port is already closed', async () => {
            assert.strictEqual(uart.isOpen, false);
            await uart.close();

        });
    });

    describe('doTransaction', () => {

        it('should respond to echo request', async () => {
            const uart = new transactor.UartTransactor({port:"COM4"});
            await uart.open();

            const request = Buffer.from('{"req":"echo","body":{"hello":"world"}}\n');
            console.log(request.toString())
            const response = await uart.doTransaction(request);
            console.log("response: " + response.toString())
            await uart.close();
            assert.ok(response.toString().includes('{"hello":"world"}'));

        });

        it('should throw error if channel is not open', async () => {
            const uart = new transactor.UartTransactor({port:"COM4"});
            try {
                const r = await uart.doTransaction('random-input\n');
            } catch(err){
                assert.strictEqual(err, 'Transactor channel not open');
                return;
            }
            assert.fail('Expected error but did not receive one');
        });

        it('should be able to send a large request to Notecard', async () => {
            const uart = new transactor.UartTransactor({port:"COM4"});
            await uart.open();
            await uart.doTransaction(Buffer.from('\n'));

            const req = Buffer.from(JSON.stringify({req:"echo",body:largeBody}) + '\n');
            const response = await uart.doTransaction(req);
            await uart.close();

            assert.ok(response.toString().includes(JSON.stringify(largeBody)));
        })

    });

});




const largeBody = {
        longstring:"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
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