module.exports = function(RED) {
    "use strict";
    
    function NotecardRequestNode(config) {
        RED.nodes.createNode(this, config);
        this.configNode = RED.nodes.getNode(config.notecard);
        
        this.payload = config.payload;
        this.payloadType = config.payloadType;

        const node = this;

        node.on("input", async function (msg) {

            //const request = RED.util.evaluateNodeProperty(this.payload, this.payloadType, this,msg);
            const request = msg.payload;
            
            const response = await this.configNode.Notecard.SendRequest(request);;
            

            msg = Object.assign({}, msg);
            msg.payload = response;
            node.send(msg);
        })

    }

    RED.nodes.registerType("notecard-request", NotecardRequestNode);
}