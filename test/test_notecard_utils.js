const util = require('../notecard/notecard-util.js');
const utilMock = require('../notecard/notecard-util.js');

const should = require('should');
const sinon = require('sinon');


context('Notecard Utils', () => {
    describe('FindPort', () => {
        it('should return empty array if no port can be found', async () => {
            const params = {productId: '0043',
                            vendorId: '2341'
                            };
            const p = await util.FindPort(params);
        
            p.should.be.Array();
            p.should.be.empty();

        });

        it('should return a port path if port can be found (upper-case letters)', async () => {
            const params = {productId: '0001',
                            vendorId: '30A4'
                            };
            const p = await util.FindPort(params);

            p.should.be.Array();
            p[0].should.be.String();
            p[0].should.not.be.empty();
        });

        it('should return a port path if port can be found (lower-case letters)', async () => {
            const params = {productId: '0001',
                            vendorId: '30a4'
                            };
            const p = await util.FindPort(params);

            p.should.be.Array();
            p[0].should.be.String();
            p[0].should.not.be.empty();
        });

        it('should return all port paths with no search params', async () => {
            const p = await util.FindPort();
            p.should.be.Array();
            p.length.should.be.greaterThan(0);
            for(let i = 0; i<p.length; i++){
                p[i].should.be.String();
            }
        });

        it('should return empty array if search parameter cannot be found', async () => {
            const params = {invalidSearchParameter: 'random-value'
                            };
            const p = await util.FindPort(params);

            p.should.be.Array();
            p.should.be.empty();

        });

    });

    describe("FindNotecardSerial", () => {
        it('should return empty array if Notecard cannot be found', async () => {
            var s = {list:sinon.stub().resolves([])}
            utilMock.setSerialPortDriver(s)

            const p = await utilMock.FindNotecardSerial();

            p.should.be.Array();
            p.should.be.empty();


        });

        it('should with one element array if Notecard on USB can be found', async () => {
            var s = {list:sinon.stub().resolves([{  path: 'COM4',
                                                    productId: '0001',
                                                    vendorId: '30A4'
                                                }])}
            utilMock.setSerialPortDriver(s)

            const p = await utilMock.FindNotecardSerial();

            p.should.be.Array();
            p.length.should.equal(1);
            p[0].name.should.deepEqual('COM4');
            p[0].isNotecard.should.be.true();
            p[0].baudrate.should.equal(9600);

        });

        it('should with one element array if any serial port can be found', async () => {
            var s = {list:sinon.stub().resolves([{  path: 'COM3'
                                                }])}
            utilMock.setSerialPortDriver(s)

            const p = await utilMock.FindNotecardSerial();

            p.should.be.Array();
            p.length.should.equal(1);
            p[0].name.should.deepEqual('COM3');
            p[0].isNotecard.should.be.false();
            should.not.exist(p[0].baudrate);

        });

        it('should return array with 2 elements if on USB serial port and one non-USB found', async ()=> {
            var s = {list:sinon.stub().resolves([{  path: 'COM4',
                                                    productId: '0001',
                                                    vendorId: '30A4'
                                                }, 
                                                {  path: 'COM3'
                                                }])};


            utilMock.setSerialPortDriver(s)

            const p = await utilMock.FindNotecardSerial();

            p.should.be.Array();
            p.length.should.equal(2);
            p[0].name.should.deepEqual('COM4');
            p[0].isNotecard.should.be.true();
            p[0].baudrate.should.equal(9600);

            p[1].name.should.deepEqual('COM3');
            p[1].isNotecard.should.be.false();
            should.not.exist(p[1].baudrate);
        });
    })
});

