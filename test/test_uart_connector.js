

var assert = require('assert');
const uart = require('../notecard/uart-connector.js');

var port = "";

findNotecard().then((p) => {
    port = p;});


describe('UART Connector', () => {
    describe('constructor', () => {

        it('should have default config values', () => {
            const s = new uart.UartConnector();
            assert.strictEqual(s.Port,"");
            assert.strictEqual(s.BaudRate, 9600);

        });

        it('should have correct port when passed in config object', () => {
            const c = {port: "portABC"};
            const s = new uart.UartConnector(c);

            assert.strictEqual(s.Port, c.port);
        });

        it('should have correct baud rate when passed in config object', () => {
            const c = {baudrate: 7};
            const s = new uart.UartConnector(c);

            assert.strictEqual(s.BaudRate, c.baudrate);
        });
    });

    

    describe('Open, IsOpen, and Close', () => {
        it('should open the port and \'IsOpen\' should be true, close the port', async () => {
            const s = new uart.UartConnector({port:port})
            await s.Open();
            const tfOpen = s.IsOpen;
            await s.Close();
            const tfClose = s.IsOpen;

            tfOpen.should.be.true();
            tfClose.should.be.false();
        });
    });

    describe('Open', () => {
        it('should be rejected if serial port is not available', () => {
            const s = new uart.UartConnector({port:"nonsense"})
            const p = s.Open()
            return p.should.be.rejected()
        });
    })

    describe('IsOpen', () => {
        const s = new uart.UartConnector({port:port});
        it('should return \'false\' if Open has not been called', () => {
            const tf = s.IsOpen;
            tf.should.be.false();
        });
    });

    describe('Close', () => {
        it('should execute without error if port is already closed', async () => {
            const s = new uart.UartConnector({port:port});
            s.IsOpen.should.be.false();

            await s.Close();


        });
    });

    describe('SendReceive', () => {
        it('should respond to echo request', async () => {
            const s = new uart.UartConnector({port:port});
            await s.Open();
            const message = `{"hello":"world"}`;
            const request = buildEchoRequest(message);
    
            const response = await s.SendReceive(request);
    
            await s.Close();
            response.should.containEql(message)
            

        });

        it('should throw an error if connector is not open', () => {
            const s = new uart.UartConnector({port:port});
            s.IsOpen.should.be.false();

            return (s.SendReceive(`\n`)).should.be.rejectedWith({ message: 'Connector not open' });
        });

        it('should be able to send and receive large request body', async () => {
            const s = new uart.UartConnector({port:port});
            await s.Open();

            const message = JSON.stringify(largeBody);
            const request = buildEchoRequest(message);

            try{
                const response = await s.SendReceive(request);
                response.should.containEql(message);
            }
            finally{
                await s.Close();
            }
        });

    });

    describe('Send', () => {
        
        it('should resolve without error', async () => {
            const c = buildEchoCommand(`{"random":"command}`);
            const s = new uart.UartConnector({port:port});

            await s.Open();
            const p = s.Send(c);
            return p.should.be.resolved().finally(()=> s.Close());

        });

        it('should throw an error if connector is not open', () => {
            const s = new uart.UartConnector({port:port});
            s.IsOpen.should.be.false();

            return (s.Send(`\n`)).should.be.rejectedWith({ message: 'Connector not open' });
        });
    });

});

    



async function findNotecard() {
    notecardUsbParams = {productId: '0001',
                        vendorId: '30A4'
                        }
    const p = await uart.FindPort(notecardUsbParams);

    return(p[0]);

}

function buildEchoRequest(body){
    return `{"req":"echo","body":${body}}\n`;
}

function buildEchoCommand(body){
    return `{"cmd":"echo","body":${body}}\n`;
}



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