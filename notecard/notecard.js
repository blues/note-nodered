




module.exports = function(RED) {
    "use strict";
    var I2C = require("i2c-bus");

    

    // The Output Node
    function NotecardRequestNode(n) {
        //TODO: add a mutex to prevent multiple sends from different nodes
        RED.nodes.createNode(this, n);
        this.busno = isNaN(parseInt(n.busno)) ? 1 : parseInt(n.busno);
        this.address = parseInt(n.address);
        //this.command = parseInt(n.command);
        //this.count = parseInt(n.count);
        this.payload = n.payload;
        this.payloadType = n.payloadType;
        this.outputType = n.outputType;
        var node = this;

        node.port = I2C.openSync( node.busno );
        

    


        node.on("close", function() {
            node.port.closeSync();
        });

        
        const MAX_CHUNK_SIZE_IN_BYTES = 255;
        const FRAME_HEADER_SIZE = 2;
        var dataBuffer = Buffer.alloc(MAX_CHUNK_SIZE_IN_BYTES + FRAME_HEADER_SIZE);
        var requestReadCommandBuffer = Buffer.from([0, 0]);
        
       

        const REQUEST_FRAME_HEADER_SIZE = 1;
       

        node.on("input", function(msg) {
            var myPayload;
            var inputPayloadType = ""
            var address = node.address;
            if (isNaN(address)) address = msg.address;
            //var command = node.command;
            //if (isNaN(command)) command = msg.command;
            address = parseInt(address);
            //command = parseInt(command);
            var buffcount = parseInt(node.count);
            if (isNaN(address)) {
                this.status({fill:"red",shape:"ring",text:"Address ("+address+") value is missing or incorrect"});
                return;
            // } else if (isNaN(command) ) {
            //     this.status({fill:"red",shape:"ring",text:"Command  ("+command+") value is missing or incorrect"});
            //     return;
            } else {
                this.status({});
            }

            const initialPollWaitTimeMs = 25;
            const pollingIntervalMs = 5;
            const notecardResponseTimeoutMs = 2000;
            var isTimedOut = false
            
            var pollingTimer;

            try {
                if (this.payloadType == null) {
                    myPayload = this.payload;
                } else if (this.payloadType == 'none') {
                    myPayload = null;
                } else {
                    myPayload = RED.util.evaluateNodeProperty(this.payload, this.payloadType, this,msg);
                }
                if (myPayload == null || node.count == 0) {
                    node.error(Error("payload is null or empty"))
                    return
                    
                }
                inputPayloadType = typeof myPayload
                if (inputPayloadType === "string"){ // || Array.isArray(myPayload)) {

                    myPayload = Buffer.from(myPayload + "\n");
                } else if (inputPayloadType === "object")
                {
                    myPayload = Buffer.from(JSON.stringify(myPayload) + "\n");
                }
                else{
                    node.error("Unsupported input type. Must be string or JSON object")
                }
               
                setTimeout(cancelNotecardDataRequest, notecardResponseTimeoutMs);
                
                sendNotecardRequest(myPayload);
                
                pollingTimer = setTimeout(pollNotecardForData, initialPollWaitTimeMs);
            } catch(err) {
                this.error(err,msg);
                return
            }

            
            var responseStr = "";

            function sendNodeResponse(dataStr)
            {
                msg = Object.assign({}, msg);
                msg.address = address;
                if(node.outputType === "str" || (node.outputType === "" && inputPayloadType === "string")){
                    msg.payload = dataStr;
                } else {
                    msg.payload = JSON.parse(dataStr);
                }  
                node.send(msg);
            }
            
            function sendNotecardRequest(requestBuffer){
                var numBytesSent = 0;
                var numRequestBytes = requestBuffer.length;

                while(numBytesSent < numRequestBytes && !isTimedOut){
                    numBytesSent += sendBytesToNotecard(requestBuffer.slice(numBytesSent));
                }
            }
            function readNotecardResponse(numBytes){
                
                
                var localBuffer = readBytesFromNotecard(numBytes);
                availableBytes = localBuffer[0];
                var payloadLength = localBuffer[1];
                var hasTerminatorCharacter = localBuffer[localBuffer.length - 1] === 0x0a;

                responseStr += localBuffer.toString();

                if(hasTerminatorCharacter === true){
                    sendNodeResponse(responseStr);
                    //TODO: what do we do if the availableBytes is non-zero?
                    return;
                }

                if(isTimedOut === true){
                    return;
                }

                setTimeout(() => readNotecardResponse(availableBytes), 5);

            }

            
            

            function cancelNotecardDataRequest(){
                isTimedOut = true;
            }

            
            function pollNotecardForData()
            {
                
                var numBytes = queryBytesAvailable();
                
                if(numBytes === 0){
                    // No bytes available to read from the Notecard. Keep waiting)
                    if(isTimedOut){
                        // Waited long enough.  Raise exception
                        node.error("Timed out waiting for Notecard Response");
                        throw Error("Timed out waiting for Notecard Response");
                    }
                    pollingTimer = setTimeout(pollNotecardForData, pollingIntervalMs)
                    return
                }
                
                readNotecardResponse(numBytes);
            }

            function sendBytesToNotecard(localBuffer){
                var numBytes = localBuffer.length;
                // limit data frame size
                if(numBytes > MAX_CHUNK_SIZE_IN_BYTES){
                    localBuffer = localBuffer.slice(0, MAX_CHUNK_SIZE_IN_BYTES);
                    numBytes = localBuffer.length;
                }
                // formulate data frame
                localBuffer.copy(dataBuffer, REQUEST_FRAME_HEADER_SIZE);
                dataBuffer[0] = numBytes;
                var numBytesToWrite = numBytes + REQUEST_FRAME_HEADER_SIZE;
                // Write the frame data on i2c bus
                node.warn("here");
                var numBytesWritten = node.port.i2cWriteSync(address, numBytesToWrite, dataBuffer);
                
                if(numBytesWritten != numBytesToWrite){
                    throw Error("Failed to write request to retrieve available serial stream data from Notecard");
                }
                // return the number of serial stream data bytes written to i2c
                return numBytes;
    
            }

            function queryBytesAvailable(){
                // Send [0,0] to query available bytes in I2C serial stream on Notecard
                // buffer[0] = 0  ==> tell Notecard to query bytes available
                // buffer[1] = 0  ==> number of serial stream data bytes requested from Notecard
                const buffer = Buffer.from([0,0]);
                const length = buffer.length;
                // Send the request
                var numBytesWritten = node.port.i2cWriteSync(address, length, buffer);
                if(numBytesWritten != length){
                    node.error("Failed to write bytes available query on i2c");
                    throw Error("Failed to write bytes available query on i2c");
                }
    
                // Wait for the response
                // Response is expected to be 2 bytes
                // buffer[0] ==> number of serial stream data bytes available to read from Notecard
                // buffer[1] ==> number of serial stream data bytes sent from Notecard on this transaction
                 
                var numBytesRead = node.port.i2cReadSync(address, length, buffer);
    
                if(numBytesRead === 0){
                    throw Error("Expected 2 bytes in response from Notecard data available query");
                }
    
                // For a data query, expect byte[1] to be 0 because Notecard should not be sending
                // serial stream data bytes in a bytes available request. If it did, something went wrong.
                if(buffer[1] != 0){
                    throw Error("Notecard serial stream data query sent non-zero data bytes");
                }
    
                // Return number of bytes that are available to read from Notecard I2C serial stream interface
                return buffer[0];
    
            }

            function readBytesFromNotecard(numBytes){
                numBytes = numBytes > MAX_CHUNK_SIZE_IN_BYTES ? MAX_CHUNK_SIZE_IN_BYTES : numBytes;
    
                // Send [0,numBytes] to read bytes in I2C serial stream on Notecard
                // buffer[0] = 0  ==> tell Notecard to send available serial stream data
                // buffer[1] = numBytes  ==> number of serial stream data bytes requested from Notecard
                requestReadCommandBuffer[0] = 0;
                requestReadCommandBuffer[1] = numBytes;
                // send read request to Notecard
                var numBytesWritten = node.port.i2cWriteSync(address, requestReadCommandBuffer.length, requestReadCommandBuffer);
                if(numBytesWritten != requestReadCommandBuffer.length ){
                    throw Error("Failed to write request to retrieve amount of available serial stream data from Notecard");
                }
    
                var numBytesToRead = numBytes + FRAME_HEADER_SIZE;
                // read response bytes from Notecard
                var numBytesRead = node.port.i2cReadSync(address, numBytesToRead, dataBuffer);
                if(numBytesRead < numBytesToRead){
                    throw Error("Failed to read expected number of bytes from Notecard");
                }
    
                return dataBuffer.slice(0,numBytesRead);
            }
    
            
        });
    
    }

    
    RED.nodes.registerType("notecard request", NotecardRequestNode);
}