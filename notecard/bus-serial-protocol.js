class SerialBus {

    _read = async () => ({numBytesToRead: 0, data:Buffer.alloc(0)})
    _write = async () => {}
    _delay = async () => {}
    constructor(config){
        if(config === undefined)
            return

        if('read' in config)
            this._read = config.read;

        if('write' in config)
            this._write = config.write;

        if('delay' in config)
            this._delay = config.delay

    }

    async SendByteChunks(payload, delayFn = async()=>{}, chunkLength = DEFAULT_SEND_CHUNK_LENGTH){

        while(payload.length > 0){
            const numBytes = (payload.length > chunkLength) ? chunkLength : payload.length;
            //console.log(`numbytes: ${numBytes}`)
            const b = Buffer.alloc(numBytes + SEND_BYTE_HEADER_LENGTH)
            b[0] = numBytes;
            payload.copy(b, SEND_BYTE_HEADER_LENGTH)
            
            
            await this._write(b);
            payload = payload.slice(numBytes);
    
            if(payload.length <= 0)
                return
            
            await this._delay()
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
//RENAME QueryAvailableBytes
async function queryAvailableBytes(rw){
    const buffer = Buffer.from([0, 0]);
    const QUERY_REQUEST_SIZE = 2;
    const QUERY_RESPONSE_SIZE = 2;

    var numBytesWritten = await rw.write(QUERY_REQUEST_SIZE, buffer);
    if(numBytesWritten < QUERY_REQUEST_SIZE ){
        
        throw new Error("this was too small");
    }
    
    var numBytes = await rw.read(QUERY_RESPONSE_SIZE, buffer);
    if(numBytes < QUERY_RESPONSE_SIZE){
        throw new Error("number of response bytes is fewer than 2");
    }

    if(buffer[1] != 0){
        throw new Error("response payload size on query is non-zero");
    }

    return buffer[0];


}

const SEND_BYTE_HEADER_LENGTH = 1;
const DEFAULT_SEND_CHUNK_LENGTH = 250;
async function SendByteChunks(writeFn, payload, delayFn = async()=>{}, chunkLength = DEFAULT_SEND_CHUNK_LENGTH){

    while(payload.length > 0){
        const numBytes = (payload.length > chunkLength) ? chunkLength : payload.length;
        //console.log(`numbytes: ${numBytes}`)
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

//RENAME SendByteChunks
async function sendRequest(rw, request, payloadSize, token={isCancelled:false}, delayFn = async()=>{}){
    const REQUEST_FRAME_HEADER_SIZE = 1;
    const chunkSize = payloadSize + REQUEST_FRAME_HEADER_SIZE;
    const buffer = Buffer.alloc(chunkSize);
    
    var requestSlice = request.slice(0);

    
    var bytesToSend = requestSlice.length;
    while(token.isCancelled === false){
        
        bytesToSend = (bytesToSend > payloadSize) ? payloadSize : bytesToSend;
        requestSlice.copy(buffer, REQUEST_FRAME_HEADER_SIZE, 0, bytesToSend);

        buffer[0] = bytesToSend;
        var numBytesToWrite = bytesToSend + REQUEST_FRAME_HEADER_SIZE;
        var numBytesWritten = await rw.write(numBytesToWrite, buffer);
        
        requestSlice = requestSlice.slice(numBytesWritten - REQUEST_FRAME_HEADER_SIZE);
        bytesToSend = requestSlice.length;
        if(bytesToSend <= 0){
            return;
        }
        await delayFn();
    }
    return;

}


function sendReadRequest(writeFn, numBytesToRead=0){
    const p = Buffer.from([0, numBytesToRead]);
    return(writeFn(p));
}
const READ_FRAME_HEADER_LENGTH = 2;
async function readBytes(readFn, numBytesToRead, dataBuffer){
    const {numBytes, data} = await readFn(numBytesToRead + READ_FRAME_HEADER_LENGTH);
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

const RESPONSE_FRAME_HEADER_SIZE = 2;

//RENAME ReceiveByteChunks
async function readResponse(rw, numBytesAvailable, payloadSize, token={isCancelled:false}){
    
    const chunkSize = payloadSize + RESPONSE_FRAME_HEADER_SIZE;
    var readRequest = Buffer.from([0, 0]);
    var readResponse = Buffer.alloc(chunkSize);
    var response = Buffer.alloc(0);

    while (numBytesAvailable > 0 && token.isCancelled === false){
        var numBytesRequested = (numBytesAvailable > payloadSize) ? payloadSize : numBytesAvailable;
        readRequest[1] = numBytesRequested;

        var numBytesWritten = await rw.write(readRequest.length, readRequest);

        var numBytesToRead = numBytesRequested + RESPONSE_FRAME_HEADER_SIZE;

        var numBytesRead = await rw.read(numBytesToRead, readResponse);
        numBytesAvailable = readResponse[0];

        response = Buffer.concat([response, readResponse.slice(RESPONSE_FRAME_HEADER_SIZE, numBytesRead)])
    }
    
    return response;
}

async function reset(rw, payloadSize){
    
    await readResponse(rw, payloadSize, payloadSize);
    
}

module.exports = {SerialBus, SendByteChunks, ReceiveByteChunks,QueryAvailableBytes};
