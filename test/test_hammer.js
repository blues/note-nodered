const notecard = require('../notecard/notecard.js');


const isEnabled = false;
const connection = 'uart'; //'i2c';
let numIterations = 25;

(isEnabled ? describe : describe.skip)('Hammer Notecard with Requests', () => {

    const request = {req:"card.version"};
    const nc = new notecard.Notecard();
    
    it(`should survive ${numIterations} requests`, async () => {
        nc.Connector = await getConnector(connection);
        await nc.Connect();
        try{
            for(var i = 0; i< numIterations; i++){
                
                const response = await nc.SendRequest(request);
                response.should.not.be.empty();
            }
        }finally{
            await nc.Disconnect();
        }
    }).timeout(10000);
    

});

async function getConnector(socketType){
    if(socketType === 'uart'){
        const s = require('../notecard/uart-socket');
        const port = await findNotecard(s)
        return new s.UartConnector({port:port});
        
        
    }else if(socketType === 'i2c'){
        const s = require('../notecard/i2c-socket');
        return new s.I2CConnector()
    }else{
        throw new Error('Connector type not recognized')
    }
}




async function findNotecard(s) {
    notecardUsbParams = {productId: '0001',
                        vendorId: '30A4'
                        }
    const p = await s.FindPort(notecardUsbParams);

    return(p[0]);

}
