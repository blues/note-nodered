
const notecard = require('../notecard/notecard.js');
const {MockConnector, MockConnectorWithReceiveDelay, MockConnectorWithSendDelay} = require('./mock_connector.js')


describe('Notecard', () =>  {
    
    describe('SendRequest', () => {
        context('single transaction', () => {
            it('should return the expected response as a JSON object', async () => {
                const nc = new notecard.Notecard();
                nc.Connector = new MockConnector();
                nc.Connector.AddResponse(`{"Iam":"here"}\n`)

                const request = {hello:"world"};
                const response = await nc.SendRequest(request);

                response.should.be.deepEqual({Iam:"here"});

            });

            it('should send the request over the Notecard connector as a string', async () => {
                const nc = new notecard.Notecard();
                nc.Connector = new MockConnector();
                nc.Connector.AddResponse(`{"Iam":"here"}\n`)

                const request = {hello:"world"};
                await nc.SendRequest(request);

                nc.Connector.ReceivedData[0].should.equal(`{"hello":"world"}\n`)
            })
        });

        context('multiple transactions', () => {
            it('should return responses to correct requests in correct order', async () => {
                const nc = new notecard.Notecard();
                nc.Connector = new MockConnectorWithReceiveDelay();
                nc.Connector.AddResponse(`{"response1":1}\n`);
                nc.Connector.AddResponse(`{"response2":2}\n`);
                nc.Connector.AddDelay(20);
                nc.Connector.AddDelay(3);

                const r1 = nc.SendRequest({"request1":1});
                const r2 = nc.SendRequest({"request2":2});

                const response2 = await r2;
                const response1 = await r1;

                response1.should.deepEqual({"response1":1});
                response2.should.deepEqual({"response2":2});

            });
        });
    });

    describe('SendCommand', () => {
        context('single transaction', () => {

            it('should send the request over the Notecard connector as a string', async () => {
                const nc = new notecard.Notecard();
                nc.Connector = new MockConnector();

                const request = {hello:"world"};
                await nc.SendCommand(request);

                nc.Connector.ReceivedData[0].should.equal(`{"hello":"world"}\n`)
            })
        });

        context('multiple transactions', () => {
            it('should return responses to correct requests in correct order', async () => {
                const nc = new notecard.Notecard();
                nc.Connector = new MockConnectorWithSendDelay();
                nc.Connector.AddDelay(20);
                nc.Connector.AddDelay(3);

                const r1 = nc.SendCommand({"command1":1});
                const r2 = nc.SendCommand({"command2":2});

                await r2;
                await r1;

                nc.Connector.ReceivedData[0].should.equal(`{"command1":1}\n`);
                nc.Connector.ReceivedData[1].should.equal(`{"command2":2}\n`);
                

            });
        });
    });

    describe('Connect', () => {
        it('should open the connector to the Notecard', async () => {
            const nc = new notecard.Notecard();
            nc.Connector = new MockConnector(false);
            nc.Connector.IsOpen.should.be.false();

            await nc.Connect();

            nc.Connector.IsOpen.should.be.true();

        });

        it('should throw expection if connector property is not populated', async () => {
            const nc = new notecard.Notecard();
            (nc.Connector === null).should.be.true();

            return (nc.Connect()).should.be.rejectedWith({ message: 'Connector not defined' });

        });
    });

    describe('Disconnect', () => {
        it('should close the connector to the Notecard', async () => {
            const nc = new notecard.Notecard();
            nc.Connector = new MockConnector(true);
            nc.Connector.IsOpen.should.be.true();

            await nc.Disconnect();

            nc.Connector.IsOpen.should.be.false();

        });

        it('should throw expection if connector property is not populated', async () => {
            const nc = new notecard.Notecard();
            (nc.Connector === null).should.be.true();

            return (nc.Disconnect()).should.be.rejectedWith({ message: 'Connector not defined' });

        });
    });

});



