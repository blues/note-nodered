
const queue = require('./promise-queue.js')

const REQUEST_MESSAGE_TERMINATOR = '\n';

class Notecard {
    transactor = null;
    _queue;
    Socket = null;
    constructor(transactor = null){
        this.transactor = transactor;
        this._queue = new queue.PromiseQueue();
    }

    async connect() {
        await this.transactor.open();
    }

    async Connect() {
        if(this.Socket === null)
            throw new Error('Socket not defined');

        await this.Socket.Open();
    }

    async disconnect() {
        await this.transactor.close();
    }

    async Disconnect() {
        if(this.Socket === null)
            throw new Error('Socket not defined');
        
        await this.Socket.Close();
    }

    async request(req){
        
        const isString = (typeof req) === 'string';

        var reqBuffer;
        if(isString){
            reqBuffer = Buffer.from(req + "\n");
            
        }else{
            reqBuffer = Buffer.from(JSON.stringify(req) + "\n");
            
        }
        
        const generator = () => {return this.transactor.doTransaction(reqBuffer)};
        var transaction = this._queue.add(generator);
        var resBuffer = await transaction;

        if(isString){
            return(resBuffer.slice(0, -2).toString());
        }
        return(JSON.parse(resBuffer.toString()));
        
    }

    async SendRequest(request){

        const requestStr = JSON.stringify(request) + REQUEST_MESSAGE_TERMINATOR;
        const responseStr = await this.enqueueSendRequest(requestStr);

        return(JSON.parse(responseStr));
    }

    enqueueSendRequest(r){
        const generator = () => {return this.Socket.SendReceive(r)};
        return this._queue.add(generator);
    }

    async SendCommand(command){

        const commandStr = JSON.stringify(command) + REQUEST_MESSAGE_TERMINATOR;
        await this.enqueueSendCommand(commandStr);

    }

    enqueueSendCommand(c){
        const generator = () => {return this.Socket.Send(c)};
        return this._queue.add(generator);
    }


    
}

module.exports = {Notecard};