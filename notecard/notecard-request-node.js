module.exports = function(RED) {
    "use strict";
    
    function NotecardRequestNode(config) {
        RED.nodes.createNode(this, config);
        this.notecard = RED.nodes.getNode(config.notecard);
        
        this.payload = config.payload;
        this.payloadType = config.payloadType;

        const node = this;

        node.on("input", async function (msg) {

            const request = RED.util.evaluateNodeProperty(this.payload, this.payloadType, this,msg);
            
            const response = await this.notecard.sendRequest(request);
            msg = Object.assign({}, msg);
            msg.payload = response;
            node.send(msg);
        })

    }

    RED.nodes.registerType("notecard-request", NotecardRequestNode);
}