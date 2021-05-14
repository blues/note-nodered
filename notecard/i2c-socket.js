I2C = null;

class I2CSocket{

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

    get IsOpen() {
        return false;
    }

    async Open(){
        if(I2C === null)
            throw new Error('I2C not supported on this system');
    }

    async Close() {

    }

    async SendReceive(data){
        throw new Error('Socket not open');
    }

    async Send(data){
        throw new Error('Socket not open');
    }



}
module.exports = {I2CSocket};