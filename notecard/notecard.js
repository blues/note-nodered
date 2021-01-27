
const queue = require('./promise-queue.js')

class Notecard {
    transactor = null;
    _queue;
    constructor(transactor = null){
        this.transactor = transactor;
        this._queue = new queue.PromiseQueue();
    }

    async connect() {
        await this.transactor.open();
    }

    async disconnect() {
        await this.transactor.close();
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

    
}

module.exports = {Notecard};