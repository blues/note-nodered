const i2c = require('../notecard/i2c-socket.js');

const isWin = process.platform === "win32";


context('I2C Connector', () => {

    


    (isWin ? describe.skip : describe)('Hardware Testing', () => {
        
        describe('Open, IsOpen, and Close', () => {
            it('should open the port and IsOpen true, close the port and IsOpen false', async () => {
                const s = new i2c.I2CConnector();
                await s.Open();
                const tf = s.IsOpen;
                await s.Close();

                tf.should.be.true();
                s.IsOpen.should.be.false();
            
            });
        });

        describe('Open', () => {
            it('should succeed if able to detect Notecard', () => {
                const s = new i2c.I2CConnector();
                const p = s.Open();
                return p.should.be.resolved().finally(()=>s.Close());
            });

            it('should throw error if unable to detect Notecard', () => {
                const s = new i2c.I2CConnector({address:0x19});
                const p = s.Open();
                return p.should.be.rejectedWith('Unable to detect Notecard').finally(()=>s.Close());
            });
        });


        describe('SendReceive', () => {
            it('should response to echo request', async () => {
                const m = `{"hello":"world"}`;
                const req = buildEchoRequest(m);

                const s = new i2c.I2CConnector();
                await s.Open();
                try {
                    const res = await s.SendReceive(req);
                    res.should.contain(m);
                }finally{
                    s.Close()
                }
            });

            it('should respond to large echo request', async () => {
                const m = JSON.stringify(largeBody);
                const req = buildEchoRequest(m);
                
                const s = new i2c.I2CConnector();
                await s.Open();
                try {
                    const res = await s.SendReceive(req);
                    res.should.contain(m);
                }finally{
                    s.Close()
                }
            });
        });

        describe('Send', () => {
            it('should resolve without error', async () => {
                const m = `random-command`;
                const c = buildCommand(m);
                const s = new i2c.I2CConnector();

                await s.Open();
                const p = s.Send(c);

                return p.should.be.resolved().finally(()=> s.Close());

            });
        });
    });

    (isWin ? describe : describe.skip)('Windows Testing', () => {
        
        describe('Open', () => {
            it('should throw error', () => {
                const s = new i2c.I2CConnector();
                const p = s.Open();
                return p.should.be.rejectedWith('I2C not supported on this system');
            });
        });
    });

    describe('All platforms', () => {
        
        describe('constructor', () => {
            it('should have correct default values', () => {
                const s = new i2c.I2CConnector()

                s.Address.should.equal(0x17);
                s.BusNumber.should.equal(1);
            });

            it('should have correct address when passed in via config', () => {
                const config = {address: 0x19};
                const s = new i2c.I2CConnector(config);

                s.Address.should.equal(0x19);
            })

            it('should have correct bus number when passed in via config', () => {
                const config = {busNumber: 7};
                const s = new i2c.I2CConnector(config);

                s.BusNumber.should.equal(7);
            });
        });

        describe('IsOpen - all platforms', () => {
            it('should return false if connector has not been opened', () => {
                const s = new i2c.I2CConnector();

                s.IsOpen.should.be.false();
            });
        });

        describe('Close - all platforms', () => {
            it('should succeed if connector is not open', () => {
                const s = new i2c.I2CConnector();
                s.IsOpen.should.be.false();
                const p = s.Close();

                return p.should.be.resolved();
            });
        });

        describe('SendReceive - all platforms', () => {
            it('should throw an error is connector is not open', () => {
                const s = new i2c.I2CConnector()
                s.IsOpen.should.be.false();

                return (s.SendReceive(`\n`)).should.be.rejectedWith({ message: 'Connector not open' });
            });
        });

        describe('Send - all platforms', () => {
            it('should throw an error is connector is not open', () => {
                const s = new i2c.I2CConnector()
                s.IsOpen.should.be.false();

                return (s.Send(`\n`)).should.be.rejectedWith({ message: 'Connector not open' });
            });
        });
    });
});




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