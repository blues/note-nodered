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

    describe('SendByteChunks', () => {
        it('should populate the first byte with the number of payload bytes sent', async () => {
            const c = new MockChannelReadWriter()
            const payload = Buffer.from('my_payload');
            const w = (d) => c.Write(d);
            await protocol.SendByteChunks(w, payload);

            c.WriteData[0][0].should.equal(payload.length);
        });

        it('should populate from byte 2 onward the payload bytes sent', async () => {
            const c = new MockChannelReadWriter();
            const w = (d) => c.Write(d);
            const payload = Buffer.from('my_payload');

            await protocol.SendByteChunks(w, payload);

            c.WriteData[0].slice(1).should.deepEqual(payload);
        });

        it('should generate multiple writes if the payload exceeds chunk length', async () => {
            const c = new MockChannelReadWriter();
            const w = (d) => c.Write(d);
            const p1 = 'payload1___';
            const p2 = 'payload2';
            const payload = Buffer.from(p1 + p2);
            const chunkLength = p1.length;

            await protocol.SendByteChunks(w, payload, ()=>{}, chunkLength);

            c.WriteData[0][0].should.equal(p1.length);
            c.WriteData[0].slice(1).should.deepEqual(Buffer.from(p1));
            c.WriteData[1][0].should.equal(p2.length);
            c.WriteData[1].slice(1).should.deepEqual(Buffer.from(p2));
        })

        it('should call delay function at least once if chunk length is on sending message is exceeded', async () => {
            const w = (d) => d.length;
            const p1 = 'payload1___';
            const p2 = 'payload2';
            const payload = Buffer.from(p1 + p2);
            const chunkLength = p1.length;

            const delayFn = sinon.fake()

            await protocol.SendByteChunks(w, payload, delayFn, chunkLength)

            delayFn.calledOnce.should.be.true();

        });
    });

    describe('ReceiveByteChunks', () => {

        it('should write 0 as the first bytes to the write buffer', async () => {
            const c = new MockChannelReadWriter();
            const w = (d) => c.Write(d);
            const r = (n) => c.Read(n);

            c.AppendReadData(Buffer.from('some data'));

            await protocol.ReceiveByteChunks(r, w, 0);

            c.WriteData[0][0].should.equal(0);
        
        });

        it('should write numBytesToRead to second byte of the write buffer', async () => {
            const c = new MockChannelReadWriter();
            const w = (d) => c.Write(d);
            const r = (n) => c.Read(n);

            c.AppendReadData(Buffer.from('some data'));
            const n = 1;
            await protocol.ReceiveByteChunks(r, w, n);

            c.WriteData[0][1].should.equal(n);
        
        });

        it('should return data in channel Read buffer', async () => {
            const c = new MockChannelReadWriter();
            const w = (d) => c.Write(d);
            const r = (n) => c.Read(n);
            const b =Buffer.from('some data');
            c.AppendReadData(b);

            const data = await protocol.ReceiveByteChunks(r, w, b.length);

            data.should.deepEqual(b);
        });

        it('should return data in channel Read buffer in multiple reads', async () => {
            const c = new MockChannelReadWriter();
            const w = (d) => c.Write(d);
            const r = (n) => c.Read(n);
            const b1 =Buffer.from('some data');
            const b2 =Buffer.from('some more data');
            c.AppendReadData(b1);
            c.AppendReadData(b2);

            const data = await protocol.ReceiveByteChunks(r, w, b1.length + b2.length);

            data.should.deepEqual(Buffer.concat([b1, b2]));
        });
    });

    describe('QueryAvailableBytes', () => {
        it('should write [0,0] to the write channel', async () => {
            const {c, r, w} = newChannelReadWriters()
            c.ReadData.push(Buffer.from([0,0]));

            await protocol.QueryAvailableBytes(r, w);

            c.WriteData[0][0].should.equal(0);
            c.WriteData[0][1].should.equal(0);
        });

        it('should return 0 if read channel returns [0,0] - no bytes to read', async () => {
            const {c, r, w} = newChannelReadWriters()
            c.ReadData.push(Buffer.from([0,0]));

            const n = await protocol.QueryAvailableBytes(r, w);

            n.should.equal(0);
        });

        it('should return non-zero if read channel returns [n, 0] - bytes available to read', async () => {
            const {c, r, w} = newChannelReadWriters()
            const N = 7;
            c.ReadData.push(Buffer.from([N,0]));
            const n = await protocol.QueryAvailableBytes(r, w);

            n.should.equal(N);
        });

        it('should return 0 is not enough bytes were written by query', async () =>{
            const {c, r, _} = newChannelReadWriters()
            c.ReadData.push(Buffer.from([99,99]));
            const w = (n) => new Promise(resolve => resolve(1));
            const n = await protocol.QueryAvailableBytes(r, w);

            n.should.equal(0);
        });

        it('should throw an error if the number of payload bytes is non-zero', () => {
            const {c, r, w} = newChannelReadWriters()
            c.ReadData.push(Buffer.from([0,99]));

            const p = protocol.QueryAvailableBytes(r, w);

            return p.should.be.rejectedWith('query returned unexpected value for byte that represents payload length');
        });
    });
});




function newChannelReadWriters(){

     let s = {c:new MockChannelReadWriter()}
     s.r = (n) => s.c.Read(n);
     s.w = (d) => s.c.Write(d);
     return s
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

