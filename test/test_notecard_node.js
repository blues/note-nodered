
const assert = require('assert');

const should = require("should");
const helper = require("node-red-node-test-helper");
const ncNode = require('../notecard/notecard-node.js');
const transactor = require('./inmem_transactor.js');

class BusMockTransactor extends transactor.InMemTransactor{
    address;
    busNumber;

    constructor(readWriter){
        super(readWriter);
        this.address = null;
        this.busNumber = null;
    }
}


helper.init(require.resolve('node-red'));



describe('Notecard Node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    after(function(done) {
        helper.stopServer(done);
    });

    afterEach(function() {
        helper.unload();
    });
    const flow = [{ id: "n1", type: "notecard-request", name: "Notecard Request" }];

    it('should be loaded with correct default values', function(done) {
        
        helper.load(ncNode, flow, () => {
            const n1 = helper.getNode("n1");
            try{
                n1.should.have.property('name', 'Notecard Request');
                n1.should.have.property('busno', 1);
                done();
            }catch(err){
                done(err)
            };
            
        });
        
    });

    it('should use msg.address field value if node address field is not populated', (done) => {
        var transactor = new BusMockTransactor();
        helper.load(ncNode, flow, () => {
            const n1 = helper.getNode("n1");
            n1.notecard.transactor = transactor;
            
            n1.on('input', () => {
                try{
                    should.equal(transactor.address, 0x19);
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.receive({address:0x19}); 
            
        });
    });

    it('should override msg.address field value with node address field value', (done) => {
        var transactor = new BusMockTransactor();
        helper.load(ncNode, flow, () => {
            const n1 = helper.getNode("n1");
            n1.notecard.transactor = transactor;

            n1.address = 0x27;
            n1.on('input', () => {
                try{
                    should.equal(n1.notecard.transactor.address, 0x27);
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.receive({address:0x19});
        })

    });
    
    
});
