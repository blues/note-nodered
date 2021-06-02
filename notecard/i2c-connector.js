function getI2CInterface()
{
    const isLinux = process.platform === 'linux'
    if(!isLinux) 
        return null

    try{
        const i2c = require('i2c-bus');
        return i2c;
    }catch{
        return null;
    }
    
}
const I2C = getI2CInterface();
const protocol = require('./bus-serial-protocol');
const RESPONSE_BYTE_POLL_INTERVAL_MS = 5;
const RESPONSE_BYTE_WAIT_INTERVAL_MS = 20;
const WRITE_CHUNK_WAIT_INTERVAL_MS = 250;
const MESSAGE_TERMINATOR = 0x0a;

class I2CConnector{

    Address = 0x17;
    BusNumber = 1;
    constructor(config){

        if(config === undefined)
            return;

        if('address' in config)
            this.Address = config.address;

        if('busNumber' in config)
            this.BusNumber = config.busNumber;

    }

    _bus = null;

    get IsOpen() {
        return (this._bus != null);
    }

    async Open(){
        if(I2C === null)
            throw new Error('I2C not supported on this system');

        this._bus = await I2C.openPromisified(this.BusNumber);
        const busHasNotecard = await this.ping();
        if(!busHasNotecard){
            await this.Close();
            throw new Error('Unable to detect Notecard');
        }
    }

    async Close() {
        if(this._bus === null)
            return

        await this._bus.close();
        this._bus = null;
    }

    async SendReceive(data){
        if(!this.IsOpen)
            throw new Error('Connector not open');
        const r = (n) => this.read(n);
        const w = (b) => this.write(b);
        const delay = () => new Promise(resolve => {setTimeout(()=>resolve(), WRITE_CHUNK_WAIT_INTERVAL_MS)});
        
        const receiveTimeoutMs = 1000;
        const t = setTimeout(() => {
            continueReceiving = false;
            throw new Error("Timeout reading response from I2C bus");
        }, receiveTimeoutMs);

        const doRetry = true;
        while(doRetry){
            await protocol.SendByteChunks(w, Buffer.from(data), delay);
            
            await timeout(RESPONSE_BYTE_WAIT_INTERVAL_MS);
            const numBytes = await this.responseBytesAreAvailable();

            let continueReceiving = true;
            

            const RESPONSE_READ_POLL_INTERVAL_MS = 50;
            let response = Buffer.alloc(0);
            await timeout(1);
            while(continueReceiving){

                const c = await protocol.ReceiveByteChunks(r, w, numBytes);
                response = Buffer.concat([response, c]);

                const hasTerminator = Buffer.compare(c.slice(-2), Buffer.from([0x0d,0x0a])) === 0;
                if(hasTerminator){
                    clearTimeout(t);
                    return response.toString();
                }
                if(Buffer.compare(c.slice(-2), Buffer.from([0x0a,0x0a])) === 0)
                    break;

                await timeout(RESPONSE_READ_POLL_INTERVAL_MS);
            }
        }

        
    }

    async Send(data){
        if(!this.IsOpen)
            throw new Error('Connector not open');

        
        const w = (d) => this.write(d);
        await protocol.SendByteChunks(w, Buffer.from(data))
    }

    async ping(){
        var info = await this._bus.scan(this.Address);
        return(info[0] === this.Address);
    }

    async write(buffer){
        const info = await this._bus.i2cWrite(this.Address, buffer.length, buffer);
        return(info.bytesWritten);
    }

    async read(numBytes){
        var buffer = Buffer.alloc(numBytes);
        const info = await this._bus.i2cRead(this.Address, numBytes, buffer);
        //{numBytes: numBytes, data: data.slice(0, numBytes)};

        return({numBytes: info.bytesRead, data: buffer.slice(0, info.bytesRead)});
    }

    async responseBytesAreAvailable(){
        const timeoutMs = 2000;
        const t = setTimeout(()=> {
            continuePolling = false;
            throw new Error("Timeout waiting for response bytes")
        }, timeoutMs);
        const r = (n) => this.read(n);
        const w = (b) => this.write(b);

        let continuePolling = true;
        while(continuePolling){
            const numBytes = await protocol.QueryAvailableBytes(r, w);
            if(numBytes > 0){
                clearTimeout(t);
                return(numBytes);
            }

            await timeout(RESPONSE_BYTE_POLL_INTERVAL_MS);
            
        }
    }



}
module.exports = {I2CConnector};

const timeout = require('util').promisify(setTimeout)