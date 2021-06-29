module.exports = function(RED) {
    "use strict";
    
    function NotecardRequestNode(config) {
        RED.nodes.createNode(this, config);
        this.configNode = RED.nodes.getNode(config.notecard);
        
        this.payload = config.payload;
        this.payloadType = config.payloadType;

        const node = this;

        node.on("input", function (msg) {

            //const request = RED.util.evaluateNodeProperty(this.payload, this.payloadType, this,msg);
            
            const request = msg.payload;
            msg = Object.assign({}, msg);
            msg.request = request
            msg.payload = {}

            this.configNode.Notecard.SendRequest(request)
                .then((response) => msg.payload = response)
                .catch((err) => node.error(err))
                .finally(() => node.send(msg))
        })

    }

    RED.nodes.registerType("notecard-request", NotecardRequestNode);
}