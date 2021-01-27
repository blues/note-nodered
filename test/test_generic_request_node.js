
const assert = require('assert');

const should = require("should");
const helper = require("node-red-node-test-helper");
const ncConfig = require('../notecard/notecard-node.js');
const ncRequest = require('../notecard/generic-request-node.js')
const transactor = require('./inmem_transactor.js');

const NotecardMessageTerminator = '\r\n';

class BusMockTransactor extends transactor.InMemTransactor{
    address;
    busNumber;

    constructor(readBufferSize = 0, writeBufferSize = 255){
        const rw = new transactor.BufferReadWriter(readBufferSize, writeBufferSize);
        super(rw);
        this.address = null;
        this.busNumber = null;
    }

    setResponseJson(response){
        this.rw.readBuffer = Buffer.from(JSON.stringify(response) + NotecardMessageTerminator);
        this.rw.readBufferIndex = 0;
    }

    reset(){
        this.rw.writeBufferIndex = 0;
        this.rw.writeBuffer.fill(0);
        this.rw.readBufferIndex = 0;
    }

}

function updateConfigNodeTransactor(n, t){
    n.notecard.transactor = t;
    n.notecard.connect();
}


helper.init(require.resolve('node-red'));

const loadFlow = (flow) => {
    const node = [ncConfig, ncRequest];
    const p = new Promise((resolve, reject) => {
        try {
            helper.load(  node, flow, () => resolve()  );
        } catch (e) {
            reject(e);
        }
    });
    return p;
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
    const flow = [{ id: "nc", type: "notecard-config", name: "Notecard Config" },
                  { id: "nr", type: "notecard-request", name: "Notecard Request", notecard:"nc", wires:[["nh"]] },
                  { id: "nh", type: "helper" }
                 ];

    
    describe('request node receives message', () => {


        const mockTransactor = new BusMockTransactor();

        

        const expectedResponse = {field1: "value1"};
        mockTransactor.setResponseJson(expectedResponse);

        it('should send out expected response', async() => {
            mockTransactor.reset();
 
            await loadFlow(flow);
            const nh = helper.getNode("nh");
            const nr = helper.getNode("nr");
            const nc = helper.getNode("nc");
            updateConfigNodeTransactor(nc, mockTransactor);
            
            const p = new Promise((resolve, reject) => {
                nh.on('input', (msg) => {
                    resolve(msg)
                });
            })

            nr.receive({payload:{req:"dostuff"}});

            const response = await p;

            assert.deepEqual(response.payload, expectedResponse);

        });
    });



});
