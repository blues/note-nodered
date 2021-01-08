

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



async function sendRequest(rw, request, payloadSize, token={isCancelled:false}){
    const REQUEST_FRAME_HEADER_SIZE = 1;
    const chunkSize = payloadSize + REQUEST_FRAME_HEADER_SIZE;
    const buffer = Buffer.alloc(chunkSize);
    
    var requestSlice = request.slice(0);

    
    var bytesToSend = requestSlice.length;
    while(bytesToSend > 0 && token.isCancelled === false){
        //payloadsize = (payloadsize > maxPayloadSize) ? maxPayloadSize : payloadsize;
        bytesToSend = (bytesToSend > payloadSize) ? payloadSize : bytesToSend;
        requestSlice.copy(buffer, REQUEST_FRAME_HEADER_SIZE, 0, bytesToSend);
        
        
        //numBytesToWrite = (numBytesToWrite > chunksize) ? chunksize : numBytesToWrite;

        buffer[0] = bytesToSend;
        var numBytesToWrite = bytesToSend + REQUEST_FRAME_HEADER_SIZE;
        var numBytesWritten = await rw.write(numBytesToWrite, buffer);
        
        requestSlice = requestSlice.slice(numBytesWritten - REQUEST_FRAME_HEADER_SIZE);
        bytesToSend = requestSlice.length;
    }

}

const RESPONSE_FRAME_HEADER_SIZE = 2;
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
        //numBytesSent = readResponse[1];

        response = Buffer.concat([response, readResponse.slice(RESPONSE_FRAME_HEADER_SIZE, numBytesRead)])
    }
    
    return response;
}

async function reset(rw, payloadSize){
    
    await readResponse(rw, payloadSize, payloadSize);
    
}

module.exports = {queryAvailableBytes, sendRequest, readResponse, reset};
