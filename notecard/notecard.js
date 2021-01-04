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
                if (myPayload.length > 32) {
                    node.error("Too many bytes to write to I2C");
                } else {
                    // node.log('log write data'+  JSON.stringify([address, command, myPayload.length, myPayload, myPayload.toString("utf-8")]));
                    node.port.writeI2cBlock(address, myPayload.length, myPayload.length, myPayload, function(err) {
                        if (err) {
                            node.error(err, msg);
                        } else {
                            //node.send(msg);
                        }
                    });
                }
            } catch(err) {
                this.error(err,msg);
                return
            }

            //await new Promise(resolve => setTimeout(resolve, 10));
            var buffcount = 32;
            var buffer = Buffer.alloc(buffcount);
            var chunk_length = 0;
            var read_length = chunk_length + 2;

            var reqBuffer = Buffer.alloc(2);
            reqBuffer[0] = 0;
            reqBuffer[1] = 0;
            var availableBytes = 0;
            var sentBytes = 0;
            var isTimedOut = false;

            

            var numReadRequests = 0;
            const MAX_READ_REQUESTS = 1000
            const MAX_I2C_BUFFER_SIZE = 32

            var responseStr = "";
            var responseBuffer = Buffer.from("");

            function sendNodeResponse()
            {
                msg = Object.assign({}, msg);
                msg.address = address;
                if(node.outputType === "str" || (node.outputType === "" && inputPayloadType === "string")){
                    msg.payload = responseStr;
                } else {
                    msg.payload = JSON.parse(responseStr);
                }  
                node.send(msg);
            }
            function buildResponse(numBytes)
            {
                
                var bufPayload = buffer.slice(2, numBytes + 2);
                
                var hasTerminatorCharacter = bufPayload[bufPayload.length - 1] === 0x0a;

                //responseBuffer = Buffer.concat([responseBuffer, bufPayload]);
                responseStr += bufPayload.toString();
                return(hasTerminatorCharacter);
                


            }
            function readNotecardResponse(){
                var numBytesWritten = node.port.i2cWriteSync(address, 2, reqBuffer)

                //var numBytesRead = node.port.readI2cBlockSync(address, read_length, read_length, buffer)
                buffer[0] = 99;
                buffer[1] = 99;
                
                var numBytesRead = node.port.i2cReadSync(address, reqBuffer[1] + 2, buffer)
                availableBytes = buffer[0];
                sentBytes = buffer[1];
                numReadRequests += 1;
                if (numReadRequests >= MAX_READ_REQUESTS)
                {
                    node.error(Error('Read request timeout'));
                    return
                }
                if(sentBytes > 0)
                {
                    var isFinished = buildResponse(sentBytes);
                    if(isFinished)
                    {
                        sendNodeResponse();
                        return;
                    }
                }
                // if(availableBytes == 0 & sentBytes != 0)
                // {
                //     sendNodeResponse(availableBytes);
                //     return;
                // }

                // if(availableBytes > 0)
                // {
                //     sendNodeResponse(availableBytes);
                // }
                
                reqBuffer[1] = Math.min(availableBytes, MAX_I2C_BUFFER_SIZE - 2);
                setTimeout(readNotecardResponse, 5);
            }
            

            var timeoutObj = setTimeout(readNotecardResponse, 5);
            
            




        });

        node.on("close", function() {
            node.port.closeSync();
        });
    }
    RED.nodes.registerType("notecard request", NotecardRequestNode);
}