const helper = require("node-red-node-test-helper");
const ncConfig = require('../notecard/notecard-node.js');
const ncRequest = require('../notecard/notecard-request-node.js')
const {MockConnector, _, ignore } = require('./mock_connector.js');
const { getNode } = require('node-red-node-test-helper');


helper.init(require.resolve('node-red'));

const loadFlow = (node, flow) => {
    const p = new Promise((resolve, reject) => {
        try {
            helper.load(  node, flow, () => resolve()  );
        } catch (e) {
            reject(e);
        }
    });
    return p;
}

const loadAndGetNodeWithConnector = async (connector) => {
    f = [{ id: "nc", type: "notecard-config", name: "Notecard Config", connector:connector},
            { id: "nr", type: "notecard-request", name: "Notecard Request", notecard:"nc", wires:[["nh"]] },
            { id: "nh", type: "helper" }
           ];
    const ncNode = [ncConfig, ncRequest];
    await loadFlow(ncNode, f);

    const nodes = { nc: helper.getNode("nc"),
                    nr: helper.getNode("nr"),
                    nh: helper.getNode("nh")}
    return nodes;
}

const generateNodeInputPromise = (node) => {

    return new Promise(resolve => {
        node.on('input', (msg) => {
            resolve(msg)
        });
    });

    
}





describe('Notecard Request Node', () => {

    before(function(done) {
        helper.startServer(done);
    });

    after(function(done) {
        helper.stopServer(done);
    });

    afterEach(function() {
        helper.unload();
    });
    
    describe('request node receives single message', () => {
        it('should send out expected response', async () => {

            const connector = new MockConnector(true);
            connector.AddResponse(`{"my":"response"}\r\n`)
            const {nc, nr, nh} = await loadAndGetNodeWithConnector(connector);
            const p = generateNodeInputPromise(nh);

            nr.receive({payload:{req:"dostuff"}});

            const response = await p;

            response.should.containDeep({payload:{my:"response"}});
            
            
        });

        it('should provide request to Notecard Connector', async () => {
            const connector = new MockConnector(true);
            connector.AddResponse(`{"my":"response"}\r\n`)
            const {nc, nr, nh} = await loadAndGetNodeWithConnector(connector);
            const p = generateNodeInputPromise(nh);
            nr.receive({payload:{req:"dostuff"}});
            await p;

            nc.Notecard.Connector.ReceivedData[0].should.containEql(`{"req":"dostuff"}`)
        });

        it('should log error if exception occurs sending request to Notecard', async () => {
            let connector = new MockConnector(false)

            
            const {nc, nr, nh} = await loadAndGetNodeWithConnector(connector);
            await nc.Notecard.Connector.Close()
            
            const p = generateNodeInputPromise(nh);
            nr.receive({payload:{req:"dostuff"}});
            await p

            
            nr.error.should.be.calledOnce()
        });
    });

});
