const protocol = require('../notecard/bus-serial-protocol.js');

const sinon = require('sinon');
const should = require('should');

class MockChannelReadWriter {
    
    ReadData = []
    WriteData = []
    
    constructor() {
        
    }

    AppendReadData(data){
        
        for(let i = 0; i < this.ReadData.length; i++){
            this.ReadData[i][0]+=data.length;
        }
        const d = Buffer.concat([Buffer.from([0, data.length]), data])
        this.ReadData.push(d);
    }

    async Read(numBytes){
        

        const data = this.ReadData.shift();
        
        if(data === undefined)
            throw new Error("Number of reads exceeded ReadData array elements")

        if(numBytes > data.length)
            numBytes = data.length;
        return{numBytes: numBytes, data: data.slice(0, numBytes)};
    }

    async Write(data){
        
        const numBytes = data.length;
        this.WriteData.push(data);
        return(numBytes);
    }

   
}

describe('bus serial protocol', () => {

    describe('constructor', () => {
        it('should parse valid options without error', () => {
            const f = async () => {}
            new protocol.SerialBus({read:f, write:f});
        });

        it('should permit passing no config without error', () => {
            const p = new protocol.SerialBus();
        });

    });

    

    describe('SendByteChunks', () => {

        it('should populate the first byte with the number of payload bytes sent', async () => {
            const {p, c} = newSerialBusAndMockChannel();
            const payload = Buffer.from('my_payload');
            
            await p.SendByteChunks(payload);

            c.WriteData[0][0].should.equal(payload.length);
        });

        it('should populate from byte 2 onward the payload bytes sent', async () => {
            const {p, c} = newSerialBusAndMockChannel();
            const payload = Buffer.from('my_payload');

            await p.SendByteChunks(payload);

            c.WriteData[0].slice(1).should.deepEqual(payload);
        });

        it('should generate multiple writes if the payload exceeds chunk length', async () => {
            const {p, c} = newSerialBusAndMockChannel();
            const p1 = 'payload1___';
            const p2 = 'payload2';
            const payload = Buffer.from(p1 + p2);
            const chunkLength = p1.length;

            await p.SendByteChunks(payload, ()=>{}, chunkLength);

            c.WriteData[0][0].should.equal(p1.length);
            c.WriteData[0].slice(1).should.deepEqual(Buffer.from(p1));
            c.WriteData[1][0].should.equal(p2.length);
            c.WriteData[1].slice(1).should.deepEqual(Buffer.from(p2));
        })

        it('should call delay function at least once if chunk length is on sending message is exceeded', async () => {
            const delayFn = sinon.fake()
            const p = new protocol.SerialBus({write:(d) => {d.length}});
            const p1 = 'payload1___';
            const p2 = 'payload2';
            const payload = Buffer.from(p1 + p2);
            const chunkLength = p1.length;

            await p.SendByteChunks(payload, delayFn, chunkLength)

            delayFn.calledOnce.should.be.true();

        });
    });

    describe('ReceiveByteChunks', () => {

        it('should write 0 as the first bytes to the write buffer', async () => {
            const {p, c} = newSerialBusAndMockChannel();
            c.AppendReadData(Buffer.from('some data'));

            await p.ReceiveByteChunks(0);

            c.WriteData[0][0].should.equal(0);
        
        });

        it('should write numBytesToRead to second byte of the write buffer', async () => {
            const {p, c} = newSerialBusAndMockChannel();

            c.AppendReadData(Buffer.from('some data'));
            const n = 1;
            await p.ReceiveByteChunks(n);

            c.WriteData[0][1].should.equal(n);
        
        });

        it('should return data in channel Read buffer', async () => {
            const {p, c} = newSerialBusAndMockChannel();
            const b =Buffer.from('some data');
            c.AppendReadData(b);

            const data = await p.ReceiveByteChunks(b.length);

            data.should.deepEqual(b);
        });

        it('should return data in channel Read buffer in multiple reads', async () => {
            const {p, c} = newSerialBusAndMockChannel();
            const b1 =Buffer.from('some data');
            const b2 =Buffer.from('some more data');
            c.AppendReadData(b1);
            c.AppendReadData(b2);

            const data = await p.ReceiveByteChunks(b1.length + b2.length);

            data.should.deepEqual(Buffer.concat([b1, b2]));
        });
    });

    describe('QueryAvailableBytes', () => {
        it('should write [0,0] to the write channel', async () => {
            const {p, c} = newSerialBusAndMockChannel();
            c.ReadData.push(Buffer.from([0,0]));

            await p.QueryAvailableBytes();

            c.WriteData[0][0].should.equal(0);
            c.WriteData[0][1].should.equal(0);
        });

        it('should return 0 if read channel returns [0,0] - no bytes to read', async () => {
            const {p, c} = newSerialBusAndMockChannel();
            c.ReadData.push(Buffer.from([0,0]));

            const n = await p.QueryAvailableBytes();

            n.should.equal(0);
        });

        it('should return non-zero if read channel returns [n, 0] - bytes available to read', async () => {
            const {p, c} = newSerialBusAndMockChannel();
            const N = 7;
            c.ReadData.push(Buffer.from([N,0]));
            const n = await p.QueryAvailableBytes();

            n.should.equal(N);
        });

        it('should return 0 is not enough bytes were written by query', async () =>{
            const {p, c} = newSerialBusAndMockChannel();
            c.ReadData.push(Buffer.from([99,99]));
            p._write = (n) => new Promise(resolve => resolve(1));
            const n = await p.QueryAvailableBytes();

            n.should.equal(0);
        });

        it('should throw an error if the number of payload bytes is non-zero', () => {
            const {p, c} = newSerialBusAndMockChannel();
            c.ReadData.push(Buffer.from([0,99]));

            const promise = p.QueryAvailableBytes();

            return promise.should.be.rejectedWith('query returned unexpected value for byte that represents payload length');
        });
    });
});


function newSerialBusAndMockChannel(){
    const c = new MockChannelReadWriter()
    const p = new protocol.SerialBus({write:(d) => {c.Write(d)}, 
                                      read: (n) => c.Read(n)});
    return {p:p,c:c}

}


/*
describe('reset', () => {
        var rw = createReadWriter();
        rw.writeBuffer = Buffer.alloc(255);
        rw.readBuffer = Buffer.alloc(255);

        var content = Buffer.from("a bunch of useless bytes\n that need to be flushed from buffer");
        var index = 0;
        var payloadSize = 11;
        var numIterations = content.length / payloadSize;
        var remainder = content.length;
    
        var i = 0;
        for(i = 0; i< numIterations; i++){
            rw.readBuffer[index++] = remainder;
            rw.readBuffer[index++] = payloadSize;
            content.copy(rw.readBuffer, index, 0, payloadSize);
            index += payloadSize;

            content = content.slice(payloadSize);
            remainder = content.length;
        }

        
        if(remainder > 0){
            rw.readBuffer[index++] = 0;
            rw.readBuffer[index++] = remainder;
            content.copy(rw.readBuffer, index, 0);
        }

        it('should flush the responses from the read buffer', async () => {
           
            rw.readBufferIndex = 0;
            await protocol.reset(rw, payloadSize);

            var numBytes = rw.readBuffer[rw.readBufferIndex];

            assert.equal(numBytes, 0, 'Number of bytes available for read is non-zero');

        });
    })

    */

