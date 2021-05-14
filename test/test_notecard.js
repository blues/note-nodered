
const notecard = require('../notecard/notecard.js');
const {MockSocket, MockSocketWithReceiveDelay, MockSocketWithSendDelay} = require('./mock_socket.js')


describe('Notecard', () =>  {
    
    describe('SendRequest', () => {
        context('single transaction', () => {
            it('should return the expected response as a JSON object', async () => {
                const nc = new notecard.Notecard();
                nc.Socket = new MockSocket();
                nc.Socket.AddResponse(`{"Iam":"here"}\n`)

                const request = {hello:"world"};
                const response = await nc.SendRequest(request);

                response.should.be.deepEqual({Iam:"here"});

            });

            it('should send the request over the Notecard socket as a string', async () => {
                const nc = new notecard.Notecard();
                nc.Socket = new MockSocket();
                nc.Socket.AddResponse(`{"Iam":"here"}\n`)

                const request = {hello:"world"};
                await nc.SendRequest(request);

                nc.Socket.ReceivedData[0].should.equal(`{"hello":"world"}\n`)
            })
        });

        context('multiple transactions', () => {
            it('should return responses to correct requests in correct order', async () => {
                const nc = new notecard.Notecard();
                nc.Socket = new MockSocketWithReceiveDelay();
                nc.Socket.AddResponse(`{"response1":1}\n`);
                nc.Socket.AddResponse(`{"response2":2}\n`);
                nc.Socket.AddDelay(20);
                nc.Socket.AddDelay(3);

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

            it('should send the request over the Notecard socket as a string', async () => {
                const nc = new notecard.Notecard();
                nc.Socket = new MockSocket();

                const request = {hello:"world"};
                await nc.SendCommand(request);

                nc.Socket.ReceivedData[0].should.equal(`{"hello":"world"}\n`)
            })
        });

        context('multiple transactions', () => {
            it('should return responses to correct requests in correct order', async () => {
                const nc = new notecard.Notecard();
                nc.Socket = new MockSocketWithSendDelay();
                nc.Socket.AddDelay(20);
                nc.Socket.AddDelay(3);

                const r1 = nc.SendCommand({"command1":1});
                const r2 = nc.SendCommand({"command2":2});

                await r2;
                await r1;

                nc.Socket.ReceivedData[0].should.equal(`{"command1":1}\n`);
                nc.Socket.ReceivedData[1].should.equal(`{"command2":2}\n`);
                

            });
        });
    });

    describe('Connect', () => {
        it('should open the socket to the Notecard', async () => {
            const nc = new notecard.Notecard();
            nc.Socket = new MockSocket(false);
            nc.Socket.IsOpen.should.be.false();

            await nc.Connect();

            nc.Socket.IsOpen.should.be.true();

        });

        it('should throw expection if socket property is not populated', async () => {
            const nc = new notecard.Notecard();
            (nc.Socket === null).should.be.true();

            return (nc.Connect()).should.be.rejectedWith({ message: 'Socket not defined' });

        });
    });

    describe('Disconnect', () => {
        it('should close the socket to the Notecard', async () => {
            const nc = new notecard.Notecard();
            nc.Socket = new MockSocket(true);
            nc.Socket.IsOpen.should.be.true();

            await nc.Disconnect();

            nc.Socket.IsOpen.should.be.false();

        });

        it('should throw expection if socket property is not populated', async () => {
            const nc = new notecard.Notecard();
            (nc.Socket === null).should.be.true();

            return (nc.Disconnect()).should.be.rejectedWith({ message: 'Socket not defined' });

        });
    });

});



