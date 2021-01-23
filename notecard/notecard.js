
const queue = require('./promise-queue.js')

class Notecard {
   
    transactor = null;
    constructor(transactor = null){
        this.transactor = transactor;
        this._queue = new queue.PromiseQueue();
    }

    async request(req){
        if(this.transactor.isOpen === false){
            await this.transactor.open();
        }

        const isString = (typeof req) === 'string';

        var reqBuffer;
        if(isString){
            reqBuffer = Buffer.from(req + "\n");
            
        }else{
            reqBuffer = Buffer.from(JSON.stringify(req) + "\n");
            
        }
        
        const resBuffer = await this._queue.add(this.transactor.doTransaction(reqBuffer));
        //const resBuffer = await this.transactor.doTransaction(reqBuffer);

        if(isString){
            return(resBuffer.slice(0, -2).toString());
        }
        return(JSON.parse(resBuffer.toString()));
    }

    
}




module.exports = {Notecard};