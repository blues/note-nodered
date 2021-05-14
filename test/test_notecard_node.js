const helper = require("node-red-node-test-helper");
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

    describe('Notecard Socket Config', () => {
        it('should configure UART socket with Serial Config options', async () => {
            const config = {socket:'uart', port:'abc', baudrate: 115200};
            const n1 = await loadAndGetNode(config);

            n1.Notecard.Socket.should.have.property('Port', config.port);
            n1.Notecard.Socket.should.have.property('BaudRate', config.baudrate);
        });

        it('should configure I2C socket with I2C Config options', async () => {
            const config = {socket:'i2c', address:0x19, busNumber:7};
            const n1 = await loadAndGetNode(config);

            n1.Notecard.Socket.should.have.property('Address', config.address);
            n1.Notecard.Socket.should.have.property('BusNumber', config.busNumber);
        });

        it('should apply arbitrary socket object if socket property is an object', async () => {
            socket = {name:"value"};
            const config = {socket:socket}

            const n1 = await loadAndGetNode(config);

            n1.Notecard.Socket.should.deepEqual(socket);

        });

        it.skip('should throw error if socket type is unknown', () => {
            const t = 'rando';
            const config = {id:"n1", type:"notecard-config", name:"Notecard Config", socket:t};
            const p =  loadFlow(ncNode, [config]);

            return p.should.be.rejectedWith(`Cannot instantiate with invalid socket type '${t}'`);
        });
    });

    
});
