
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

    const flowWithHelper = [{ id: "n1", type: "notecard-request", name: "Notecard Request",outputType:"", wires:[["n2"]] },
                            { id: "n2", type:"helper"}];
    describe('node output type set to JSON', () => {
        var expectedResponse = {field1: "value1"};
        var rw = new transactor.BufferReadWriter(255, 255);
        rw.readBuffer = Buffer.from(JSON.stringify(expectedResponse) + NotecardMessageTerminator);

        var t = new BusMockTransactor(rw);
        var outputType = 'json';
        var startFlowWithMessage  = (msg, done) => {
            helper.load(ncNode, flowWithHelper, () => {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n1.outputType = outputType;
                n1.notecard.transactor = t;
                
                n2.on('input', (msg) => {
                    try{
                        assert.deepEqual(msg.payload, expectedResponse);
                        done()
                    } catch (err){
                        done(err);
                    }
                });

                n1.receive({payload:msg});
            });
        };
       
        it('should output JSON object if input is JSON', (done) => {
            rw.readBufferIndex = 0;
            startFlowWithMessage({inputfield:"inputValue"}, done);
        });

        it('should output JSON object if input is string', (done) => {
            rw.readBufferIndex = 0;
            startFlowWithMessage('{"inputfield":"inputValue"}', done);
        });

    });

    describe('node output type set to string', () => {
        var expectedResponse = '{"field1":"value1"}';
        var rw = new transactor.BufferReadWriter(255, 255);
        rw.readBuffer = Buffer.from(expectedResponse + NotecardMessageTerminator);

        var t = new BusMockTransactor(rw);
        var outputType = 'string';
        var startFlowWithMessage  = (msg, done) => {
            helper.load(ncNode, flowWithHelper, () => {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n1.outputType = outputType;
                n1.notecard.transactor = t;
                
                n2.on('input', (msg) => {
                    try{
                        assert.strictEqual(msg.payload, expectedResponse);
                        done()
                    } catch (err){
                        done(err);
                    }
                });

                n1.receive({payload:msg});
            });
        };
       
        it('should output string object if input is JSON', (done) => {
            rw.readBufferIndex = 0;
            startFlowWithMessage({inputfield:"inputValue"}, done);
        });

        it('should output string object if input is string', (done) => {
            rw.readBufferIndex = 0;
            startFlowWithMessage('{"inputfield":"inputValue"}', done);
        });

    });

    describe('node output type set to ""', () => {
        
        var rw = new transactor.BufferReadWriter(255, 255);
        

        var t = new BusMockTransactor(rw);
        var outputType = '';
        var startFlowWithMessageAndCheckResult  = (msg, expectedResponse, done) => {
            helper.load(ncNode, flowWithHelper, () => {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n1.outputType = outputType;
                n1.notecard.transactor = t;
                
                n2.on('input', (msg) => {
                    try{
                        assert.deepEqual(msg.payload, expectedResponse);
                        done()
                    } catch (err){
                        done(err);
                    }
                });

                n1.receive({payload:msg});
            });
        };
       
        it('should output string object if input is JSON', (done) => {
            rw.readBufferIndex = 0;
            var expectedResponse = {field1: "value1"};
            rw.readBuffer = Buffer.from(JSON.stringify(expectedResponse) + NotecardMessageTerminator);
            startFlowWithMessageAndCheckResult({inputfield:"inputValue"}, expectedResponse, done);
        });

        it('should output string object if input is string', (done) => {
            rw.readBufferIndex = 0;
            var expectedResponse = '{"field1":"value1"}';
            rw.readBuffer = Buffer.from(expectedResponse + NotecardMessageTerminator);
            startFlowWithMessageAndCheckResult('{"inputfield":"inputValue"}', expectedResponse, done);
        });

    });

    describe('payload set to JSON object', () => {
        
        it('should override msg.payload field value with node Payload field value if is populated', (done) => {
            var rw = new transactor.BufferReadWriter(0, 255);
            rw.readBuffer = Buffer.from("{}" + NotecardMessageTerminator);
            var getWriteBufferString = () => rw.writeBuffer.slice(0, rw.writeBufferIndex).toString().trim();

            var t = new BusMockTransactor(rw);
            helper.load(ncNode, flowWithHelper, () => {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n1.notecard.transactor = t;
                n1.payload = {nodePayload:"nodeValue"};
                n1.payloadType = null
                n2.on('input', () => {
                    try{
                        
                        var actualRequest = getWriteBufferString();
                        should.equal(actualRequest, JSON.stringify(n1.payload));
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
                var p = {msgPayload:"msgValue"};
                n1.receive({payload:p});
            })
    
        });

    });

    
    
    
});
