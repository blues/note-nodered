
const {MockConnector, MockConnectorWithReceiveDelay, MockConnectorWithSendDelay} = require('./mock_socket.js');

describe('MockConnector', () => {
    describe('Open', () => {
        it('should result in IsOpen returning true', async () => {
            const m = new MockConnector(false);
            m.IsOpen.should.be.false();

            await m.Open();

            m.IsOpen.should.be.true();
        });

        it('should still result IsOpen returning true if socket already open', async () => {
            const m = new MockConnector(true);
            m.IsOpen.should.be.true();

            await m.Open();

            m.IsOpen.should.be.true();
        });
    });

    describe('Close', () => {
        it('should result in IsOpen returning false, even if socket is already closed', async () => {
            const m = new MockConnector(true);
            m.IsOpen.should.be.true();

            await m.Close();

            m.IsOpen.should.be.false();

            await m.Close();

            m.IsOpen.should.be.false();
        })
    });

    describe('AddResponse', () => {
        it('should append input argument to response array', () => {
            const m = new MockConnector()
            const r1 = `abcdef`;
            m.AddResponse(r1);
            m._responseData[0].should.equal(r1);

            const r2 = `qrstuv`;
            m.AddResponse(r2);
            m._responseData[1].should.equal(r2);
        });
    });

    describe('Send', () => {
        
        it('should append the ReceivedData property to whatever was sent', async () => {
            const m = new MockConnector();
            const d1 = 'abcdefg';
            await m.Send(d1);
            m.ReceivedData[0].should.equal(d1);

            const d2 = 'qrslkjsf';
            await m.Send(d2);
            m.ReceivedData[1].should.equal(d2);

        });

        it('should increment the ReceiveCount property', async () => {
            const m = new MockConnector();
            m.ReceiveCount.should.equal(0);

            await m.Send('random data');
            await m.Send('random data');
            m.ReceiveCount.should.equal(2);
            m.ResponseCount.should.equal(0);

        });
    });

    describe('SendReceive', () => {
        it('should append the ReceivedData property to whatever was sent', async () => {
            const m = new MockConnector();
            m.AddResponse(1);
            m.AddResponse(2);
            const d1 = 'abcdefg';
            await m.SendReceive(d1);
            m.ReceivedData[0].should.equal(d1);

            const d2 = 'qrslkjsf';
            await m.SendReceive(d2);
            m.ReceivedData[1].should.equal(d2);
        });

        it('should increment the ReceiveCount property', async () => {
            const m = new MockConnector();
            m.ReceiveCount.should.equal(0);
            m.AddResponse(1);
            m.AddResponse(2);

            await m.SendReceive('random data');
            await m.SendReceive('random data');
            m.ReceiveCount.should.equal(2);
        })

        it('should increment the ResponseCount property', async () => {
            const m = new MockConnector();
            m.ReceiveCount.should.equal(0);
            m.AddResponse(1);
            m.AddResponse(2);

            await m.SendReceive('random data');
            await m.SendReceive('random data');
            m.ResponseCount.should.equal(2);
        })

        it('should return data added by AddResponse method', async () => {
            const m = new MockConnector();
            const r1 = 'my-first-response';
            const r2 = 'my-second-response';
            m.AddResponse(r1);
            m.AddResponse(r2);

            let response = await m.SendReceive('some data');
            response.should.equal(r1);

            response = await m.SendReceive('some data');
            response.should.equal(r2);
        });

        it('should throw an error if no responses left to send as a reply', () => {
            const m = new MockConnector();
            
            return (m.SendReceive(`\n`)).should.be.rejectedWith({ message: 'No response data available' });
            
        });
    });
});
