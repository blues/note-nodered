const SerialPort = require("serialport");
const Readline = SerialPort.parsers.Readline
const UART = require("serialport");


class UartTransactor {
    static MAX_PAYLOAD_CHUNK_BYTES = 253;
    static MESSAGE_TERMINATOR = 0x0a;

    baudrate = 9600;
    port = "";
    constructor(config){

        if(typeof config !== 'object'){
            return;
        }

        if('port' in config){
            this.port = config.port;
        }

        if('baudrate' in config){
            this.baudrate = config.baudrate;
        }
    }

    get isOpen(){
        if( this.serial === null)
            return false;

        return this.serial.isOpen;
    }

    serial = null;

    async open(){
        return new Promise((resolve, reject) => {
            this.serial = new SerialPort(this.port, {baudRate:this.baudrate});
            this.serial.on("open", err => {if(err) reject(err);else resolve();});
        });
    }

    async close() {
        return new Promise((resolve, reject) => {

            if(this.serial === null)
                resolve();

            this.serial.close(err => {
                if(err)
                    reject(err);
                else
                    resolve();
            });

        });
    }

    async write(data) {
        return new Promise((resolve, reject) => {
            const success = this.serial.write(data);
            if(!success)
                reject(new Error("failed to write serial data"));
            resolve();

        });
    }

    async readline() {
        return new Promise((resolve, reject) => {
            let parser = new Readline();
            this.serial.pipe(parser);
            parser.on('data', (d) => resolve(d))
        });
    }

    async doTransaction(request) {

        if(!this.isOpen)
            throw "Transactor channel not open";

        var requestSlice = request.slice(0);
        var offset = 0;
        var bytesToSend = requestSlice.length;
        
        while(bytesToSend > 0){
            bytesToSend = (bytesToSend > this.MAX_PAYLOAD_CHUNK_BYTES) ? this.MAX_PAYLOAD_CHUNK_BYTES : bytesToSend;

            await this.write(requestSlice.slice(0, bytesToSend));

            requestSlice = requestSlice.slice(bytesToSend);
            bytesToSend = requestSlice.length;
                
        }

        var response = await this.readline()

        return(response)




    }
}

module.exports = {UartTransactor};