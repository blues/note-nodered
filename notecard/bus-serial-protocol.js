class SerialBus {

    _read = async () => ({numBytesToRead: 0, data:Buffer.alloc(0)})
    _write = async () => {}
    constructor(config){
        if(config === undefined)
            return

        if('read' in config)
            this._read = config.read;

        if('write' in config)
            this._write = config.write;

    }

    async SendByteChunks(payload, delayFn = async()=>{}, chunkLength = DEFAULT_SEND_CHUNK_LENGTH){

        while(payload.length > 0){
            const numBytes = (payload.length > chunkLength) ? chunkLength : payload.length;
            const b = Buffer.alloc(numBytes + SEND_BYTE_HEADER_LENGTH)
            b[0] = numBytes;
            payload.copy(b, SEND_BYTE_HEADER_LENGTH)
            
            
            await this._write(b);
            payload = payload.slice(numBytes);
    
            if(payload.length <= 0)
                return
            
            await delayFn()
        }
    }

    async ReceiveByteChunks(numBytesToRead){
        await sendReadRequest(this._write, numBytesToRead);
    
        let r = {numBytesToRead: numBytesToRead, data:Buffer.alloc(0)};
        while(r.numBytesToRead > 0){
            r = await readBytes(this._read, r.numBytesToRead, r.data);
        }
        return(r.data);
    
    }

    async QueryAvailableBytes(){
        const n = await this._write(BYTE_AVAILABLE_QUERY_REQUEST);
        if(n < BYTE_AVAILABLE_QUERY_REQUEST.length)
            return(0);
        
        const r = await this._read(READ_FRAME_HEADER_LENGTH);
        if(r.data[1] !== 0)
            throw new Error('query returned unexpected value for byte that represents payload length');
    
        return(r.data[0]);
    }
}


const BYTE_AVAILABLE_QUERY_REQUEST = Buffer.from([0,0]);
async function QueryAvailableBytes(readFn, writeFn){
    const n = await writeFn(BYTE_AVAILABLE_QUERY_REQUEST);
    if(n < BYTE_AVAILABLE_QUERY_REQUEST.length)
        return(0);
    
    const r = await readFn(READ_FRAME_HEADER_LENGTH);
    if(r.data[1] !== 0)
        throw new Error('query returned unexpected value for byte that represents payload length');

    return(r.data[0]);
}



const SEND_BYTE_HEADER_LENGTH = 1;
const DEFAULT_SEND_CHUNK_LENGTH = 250;
async function SendByteChunks(writeFn, payload, delayFn = async()=>{}, chunkLength = DEFAULT_SEND_CHUNK_LENGTH){

    while(payload.length > 0){
        const numBytes = (payload.length > chunkLength) ? chunkLength : payload.length;
        const b = Buffer.alloc(numBytes + SEND_BYTE_HEADER_LENGTH)
        b[0] = numBytes;
        payload.copy(b, SEND_BYTE_HEADER_LENGTH)
        
        
        await writeFn(b);
        payload = payload.slice(numBytes);

        if(payload.length <= 0)
            return
        
        await delayFn()
    }
}

function sendReadRequest(writeFn, numBytesToRead=0){
    const p = Buffer.from([0, numBytesToRead]);
    return(writeFn(p));
}
const READ_FRAME_HEADER_LENGTH = 2;
async function readBytes(readFn, numBytesToRead, dataBuffer){
    const {_, data} = await readFn(numBytesToRead + READ_FRAME_HEADER_LENGTH);
    return({numBytesToRead:data[0],
            data:Buffer.concat([dataBuffer, data.slice(READ_FRAME_HEADER_LENGTH)])})

}
async function ReceiveByteChunks(readFn, writeFn, numBytesToRead){
    await sendReadRequest(writeFn, numBytesToRead);

    let r = {numBytesToRead: numBytesToRead, data:Buffer.alloc(0)};
    while(r.numBytesToRead > 0){
        r = await readBytes(readFn, r.numBytesToRead, r.data);
    }
    return(r.data);

}

module.exports = {SerialBus, SendByteChunks, ReceiveByteChunks,QueryAvailableBytes};
