const SerialPort = require("serialport");
const Readline = SerialPort.parsers.Readline

const MAX_PAYLOAD_CHUNK_BYTES = 250;
const MESSAGE_TERMINATOR = '\r\n';

class UartSocket{

    Port = "";
    BaudRate = 9600;
    _serial = null;
    _readlineParser = null;
    constructor(config){
        if (typeof config !== 'object')
            return

        if('port' in config)
            this.Port = config.port;

        if('baudrate' in config)
            this.BaudRate = config.baudrate;   
    }

    get IsOpen(){
        if(this._serial === null)
            return false;

        return this._serial.isOpen;
    }

    
    async Open(){

        return new Promise((resolve, reject) => {
            this._serial = new SerialPort(this.Port, {baudRate:this.BaudRate});
            this._readlineParser = new Readline({ delimiter: MESSAGE_TERMINATOR });
            this._serial.pipe(this._readlineParser);
            this._serial.on("open", err => {
                if(err){
                    reject(err);
                    return
                }
                resolve();
            })
        })
    }

    async Close(){
        return new Promise((resolve, reject) => {
            if(this._serial === null){
                resolve();
                return;
            }
            
            this._serial.close(err =>{
                if(err){
                    reject(err);
                    return
                }
                resolve();
            });
        })
    }

    async SendReceive(request){
        if(! this.IsOpen)
            throw(new Error ('Socket not open'));

        await sendDataInChunks(this._serial, request);
        const response = await readline(this._readlineParser);
        return(response)

    }

    async Send(data){
        if(! this.IsOpen)
            throw(new Error ('Socket not open'));

        await sendDataInChunks(this._serial, data);
    }

    

}

function FindPort(searchParams){

    hasAllParams = (p) => {
        for(f in searchParams){
            if(!p.hasOwnProperty(f) || p[f] != searchParams[f])
                    return false
        }
        return true;
    };

    parsePortList = (ports) =>{
        let list = []
        for (let i = 0; i < ports.length; i++){
            const p = ports[i];
            if(hasAllParams(p)){
            
                list.push(p.path)
            }
        }
        return list;
    }

    return new Promise((resolve, reject) => {
        SerialPort.list().then(
            ports => {
                resolve(parsePortList(ports))
            },
            err => reject(err)
        )
    });
}

module.exports = {UartSocket, FindPort};

async function write(serial, data){
    return new Promise((resolve, reject) => {
        const success = serial.write(data);
        if(!success){
            reject(new Error("failed to write serial data"));
            return
        }
        resolve();
    });
}

async function drain(serial){
    return new Promise((resolve, reject) => {
        serial.drain(() => {
            resolve();
        });
    });
}

async function readline(parser){
    return new Promise((resolve, reject) => {
        parser.once('data', (d) => {
            resolve(d);
        });
    });

}

async function sendDataInChunks(serial, data){

    let d = data.slice(0);
    let n = d.length;
    while(n > 0){
        if(n > MAX_PAYLOAD_CHUNK_BYTES)
            n = MAX_PAYLOAD_CHUNK_BYTES;

        await write(serial, d.slice(0, n));
        await drain(serial);
        d = d.slice(n);
        n = d.length;
    }
    
}