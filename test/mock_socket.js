
class MockConnector {
    IsOpen = false;
    ReceivedData = [];
    _responseData = [];
    ResponseCount = 0;
    ReceiveCount = 0;
    constructor(isOpen = true){
        this.IsOpen = isOpen;
    }

    Open(){
        return new Promise(resolve =>{
            this.IsOpen = true;
            resolve();
        });
    }

    Close(){
        return new Promise(resolve => {
            this.IsOpen = false;
            resolve();
        });
    }

    AddResponse(data){
        this._responseData.push(data);
    }

    SendReceive(data){
        return new Promise((resolve, reject) => {
            if(!this.IsOpen)
                reject(new Error('Connector not open'));

            this.ReceivedData.push(data);
            this.ReceiveCount++;

            if(this.ResponseCount >= this._responseData.length)
                reject(new Error('No response data available'));

            const response = this._responseData[this.ResponseCount];
            this.ResponseCount++;
            resolve(response);
        });
    }

    Send(data){
        return new Promise((resolve, reject) => {
            if(!this.IsOpen)
                reject(new Error('Connector not open'));

            this.ReceivedData.push(data);
            this.ReceiveCount++;
            

            resolve();
        });
    }

}

class MockConnectorWithReceiveDelay extends MockConnector {
    _delay = [];
    constructor(isOpen = true){
        super(isOpen);
    }

    AddDelay(d){
        this._delay.push(d);
    }

    SendReceive(data){
        return new Promise((resolve, reject) => {
            if(!this.IsOpen)
                reject(new Error('Connector not open'));


            if(this.ReceiveCount >= this._delay.length)
                reject(new Error('No delay duration available'));

            setTimeout(() => {

                if(this.ResponseCount >= this._responseData.length)
                    reject(new Error('No response data available'));

                
                const response = this._responseData[this.ResponseCount];
                this.ResponseCount++;
                resolve(response);
            }, this._delay[this.ReceiveCount]);
            
            this.ReceivedData.push(data);
            this.ReceiveCount++;


        });
    }
}

class MockConnectorWithSendDelay extends MockConnector {
    _delay = [];
    constructor(isOpen = true){
        super(isOpen);
    }

    AddDelay(d){
        this._delay.push(d);
    }

    Send(data){
        return new Promise((resolve, reject) => {
            if(!this.IsOpen)
                reject(new Error('Connector not open'));


            if(this.ReceiveCount >= this._delay.length)
                reject(new Error('No delay duration available'));

            setTimeout(() => {
                this.ReceivedData.push(data);
                resolve();
            }, this._delay[this.ReceiveCount]);
            
            this.ReceiveCount++;


        });
    }
}

module.exports = {MockConnector, MockConnectorWithReceiveDelay, MockConnectorWithSendDelay};
