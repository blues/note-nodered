

async function queryAvailableBytes(rw){
    const requestBuffer = Buffer.from([0, 0]);
    const QUERY_REQUEST_SIZE = 2;
    var numBytesWritten = await rw.write(QUERY_REQUEST_SIZE, requestBuffer);
    if(numBytesWritten < QUERY_REQUEST_SIZE ){
        
        throw new Error("this was too small");
    }
    throw new Error("more shiiiii.... stuff to do");


}


async function sendRequest(readwriter, request){

}

async function readResponse(readwriter){

}

module.exports = {queryAvailableBytes, sendRequest, readResponse};
