
const notecard = require('./notecard.js');
const transactor = require('./i2c-transactor.js')


module.exports = function(RED) {
    "use strict";
    

    

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

        node.transactor = new transactor.I2CTransactor();
        node.transactor.busNumber = node.busno;
        node.notecard = new notecard.Notecard(node.transactor);
        

    


        node.on("close", function() {
            node.transactor.close();
        });

       

        node.on("input", async function(msg) {
            var myPayload;
            var inputPayloadType = ""
            var address = node.address;
            if (isNaN(address)) address = msg.address;
            //var command = node.command;
            //if (isNaN(command)) command = msg.command;
            address = parseInt(address);
            if(!isNaN(address)){
                node.transactor.address = address;
            }
            //command = parseInt(command);
            // var buffcount = parseInt(node.count);
            // if (isNaN(address)) {
            //     this.status({fill:"red",shape:"ring",text:"Address ("+address+") value is missing or incorrect"});
            //     return;
            // // } else if (isNaN(command) ) {
            // //     this.status({fill:"red",shape:"ring",text:"Command  ("+command+") value is missing or incorrect"});
            // //     return;
            // } else {
                this.status({});
            //}

            
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
                }
                inputPayloadType = typeof myPayload
                if (inputPayloadType !== "object"  && inputPayloadType !== "string"){ // || Array.isArray(myPayload)) {
                    node.error("Unsupported input type. Must be string or JSON object")
                }

                // const f = async (r) => await node.notecard.request(r);
                // const response = f(myPayload);
                var convertOutput = (r) => r;
                if(inputPayloadType === "string" && node.outputType === "json"){
                    convertOutput = (r) => JSON.parse(r);
                } else if (inputPayloadType === "object" && node.outputType === "string"){
                    convertOutput = (r) => JSON.stringify(r);
                }

                const response = await node.notecard.request(myPayload);

                msg = Object.assign({}, msg);
                msg.payload = convertOutput(response);
                node.send(msg);


               
                
            } catch(err) {
                this.error(err,msg);
                return
            }

    
            
        });
    
    }

    
    RED.nodes.registerType("notecard-request", NotecardRequestNode);
}