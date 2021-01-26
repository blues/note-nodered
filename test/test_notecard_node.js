
const assert = require('assert');

const should = require("should");
const helper = require("node-red-node-test-helper");
const ncNode = require('../notecard/notecard-node.js');
const transactor = require('./inmem_transactor.js');

const NotecardMessageTerminator = '\r\n';

class BusMockTransactor extends transactor.InMemTransactor{
    address;
    busNumber;

    constructor(readWriter){
        super(readWriter);
        this.address = null;
        this.busNumber = null;
        this.isOpen = true;
    }
}


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
    const flow = [{ id: "n1", type: "notecard-config", name: "Notecard Config" }];

    it('should be loaded with correct default values', function(done) {
        
        helper.load(ncNode, flow, () => {
            const n1 = helper.getNode("n1");
            try{
                n1.should.have.property('name', 'Notecard Config');
                n1.should.have.property('busNumber', 1);
                n1.should.have.property('address', 0x17);
                done();
            }catch(err){
                done(err)
            };
            
        });
        
    });

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

    it('should apply node bus number field value to transactor if populated', async () => {
        var transactor = new BusMockTransactor();
        await loadFlow(ncNode, flow);
        const n1 = helper.getNode("n1");
        n1.notecard.transactor = transactor;
        n1.notecard.connect();

        n1.busNumber = 7;

        should.equal(n1.notecard.transactor.busNumber, 7);
        
    });

    it('should apply node address field value to transactor if populated', async () => {
        var transactor = new BusMockTransactor();
        await loadFlow(ncNode, flow);
        const n1 = helper.getNode("n1");
        n1.notecard.transactor = transactor;
        n1.notecard.connect();

        n1.address = 0x27;

        //await n1.sendRequest({empty:"request"});

        should.equal(n1.notecard.transactor.address, 0x27);
        
    });

    describe('sendRequest', () => {
        context('input is JSON""', () => {

            const expectedResponse = {field1: "value1"};
            const rw = new transactor.BufferReadWriter(255, 255);
            rw.readBuffer = Buffer.from(JSON.stringify(expectedResponse) + NotecardMessageTerminator);

            const mockTransactor = new BusMockTransactor(rw);

            const sendRequestCheckResponse = async (request, expectedResponse) => {
                await loadFlow(ncNode, flow);
                const n1 = helper.getNode("n1");
                n1.notecard.transactor = mockTransactor;
                n1.notecard.connect();

                const response = await n1.sendRequest(request);
                assert.deepEqual(response, expectedResponse);
            }

            it('should return expected response as JSON', async () => {
                rw.readBufferIndex = 0;
                await sendRequestCheckResponse({payload:{my:"request"}}, expectedResponse);
            });

        });

    });
   
    
});
