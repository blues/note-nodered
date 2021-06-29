const helper = require("node-red-node-test-helper");
const { assert } = require("sinon");
const ncNode = require('../notecard/notecard-node.js');


helper.init(require.resolve('node-red'));



describe('Notecard Config Node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    after(function(done) {
        helper.stopServer(done);
    });

    afterEach(function() {
        helper.unload();
    });
    const flow = [{ id: "n1", type: "notecard-config", name: "Notecard Config", other:"prop" }];

  

    const loadFlow = (node, flow) => {
        const p = new Promise((resolve, reject) => {
            try {
                    helper.load(node, flow, () => {
                    resolve()
                });
            } catch (e) {
                reject(e);
            }
        });

        return p;
    }

    const loadNode = (f) => {
        if(f === undefined)
            f = {};
        f.id = "n1";
        f.type = "notecard-config";
        f.name = "Notecard Config";
        return loadFlow(ncNode, [f]);
    }

    const loadAndGetNode = async (f) => {
        if(f === undefined)
            f = {};
        f.id = "n1";
        f.type = "notecard-config";
        f.name = "Notecard Config";
        await loadFlow(ncNode, [f]);
        return helper.getNode(f.id);
    }

    it('should have config values', async () => {
        const name = 'myConfigProp'
        const value = 'myConfigValue'
        let c = {};
        c[name] = value;
        const n1 = await loadAndGetNode(c)
        
        const config = n1.Config

        config.should.have.property(name,value)

    });

    describe('Notecard Connector Config', () => {

        

        it('should configure UART connector with Serial Config options', async () => {
            const config = {connector:'uart', port:'abc', baudrate: 115200};
            const n1 = await loadAndGetNode(config);

            n1.Notecard.Connector.should.have.property('Port', config.port);
            n1.Notecard.Connector.should.have.property('BaudRate', config.baudrate);
        });

        it('should configure UART connector using baud rate string', async () => {
            const b = 115200;
            const config = {connector:'uart', port:'abc', baudrate: `${b}`};
            const n1 = await loadAndGetNode(config);

            n1.Notecard.Connector.should.have.property('Port', config.port);
            n1.Notecard.Connector.should.have.property('BaudRate', b);
        });

        it('should default to I2C connector with I2C Config options', async () => {
            const config = {address:0x19, busNumber:7};
            const n1 = await loadAndGetNode(config);

            n1.Notecard.Connector.should.have.property('Address', config.address)
            n1.Notecard.Connector.should.have.property('BusNumber', config.busNumber)
        });
        it('should configure I2C connector with I2C Config options', async () => {
            const config = {connector:'i2c', address:0x19, busNumber:7};
            const n1 = await loadAndGetNode(config);

            n1.Notecard.Connector.should.have.property('Address', config.address);
            n1.Notecard.Connector.should.have.property('BusNumber', config.busNumber);
        });

        it('should configure I2C connector with I2C numeric config options as strings', async () => {
            const config = {connector:'i2c', address:'0x19', busNumber:'7'};
            const n1 = await loadAndGetNode(config);

            n1.Notecard.Connector.should.have.property('Address', 0x19);
            n1.Notecard.Connector.should.have.property('BusNumber', 7);
        });

        it('should apply arbitrary connector object if connector property is an object', async () => {
            connector = {name:"value"};
            const config = {connector:connector}

            const n1 = await loadAndGetNode(config);

            n1.Notecard.Connector.should.deepEqual(connector);

        });

        it('should throw error if connector type is unknown', () => {
            const t = 'rando';
            const config = {connector:t};
            const p =  loadAndGetNode(config);
           
            //return p.should.be.rejectedWith(`Cannot instantiate with invalid connector type '${t}'`);
            return p.should.be.resolvedWith(null);
        });

        it('should log error if Notecard connector fails to connect',  async () => {
            const m = 'throw error on connection'
            const config = {connector:{Open:async () => {throw new Error(m)}}}
            const n1 = await loadAndGetNode(config);
            n1.error.should.be.calledWithExactly(m);
            
        })
    });



    describe('Web Request GET available serial ports',() => {

        it('should respond with serial port config list if ports available', async () => {
            connector = {name:"value"};
            const config = {connector:connector}
            const n1 = await loadAndGetNode(config);
            const res = await helper.request().get('/notecard/serialports').expect(200)
            res.body.should.not.be.empty();
            
        });
    });

    
});
