

class Notecard {
    transactor = null;
    constructor(transactor = null){
        this.transactor = transactor;
    }

    async request(req){
        if(this.transactor.isOpen === false){
            await this.transactor.open();
        }
        const reqBuffer = Buffer.from(JSON.stringify(req) + "\n");
        //const reqBuffer = Buffer.from(JSON.stringify(req));
        const resBuffer = await this.transactor.doTransaction(reqBuffer);

        return(JSON.parse(resBuffer.toString()));
    }

    
}




module.exports = {Notecard};