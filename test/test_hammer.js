const notecard = require('../notecard/notecard.js');
const should = require('should');


const isEnabled = true;
const connection = 'i2c'; //'uart'; //'i2c';
let numIterations = 25;

(isEnabled ? describe : describe.skip)('Hammer Notecard with Requests', () => {

    const request = {req:"echo",body:{iter:-99}};
    const nc = new notecard.Notecard();
    
    it(`should survive ${numIterations} echo requests`, async () => {
        nc.Connector = await getConnector(connection);
        var i = 0;
        await nc.Connect();
        try{
            for(i = 0; i< numIterations; i++){
                request.body.iter = i    
                const response = await nc.SendRequest(request);
                response.body.iter.should.equal(i);
            }
        }finally{
            console.log(`last iteration: ${i}`)
            await nc.Disconnect();
        }
    }).timeout(10000);
    

});

async function getConnector(connectorType){
    const systemType = process.platform
    if(connectorType === 'uart'){
        const s = require('../notecard/uart-connector');
        const port = await findNotecard(s)
        return new s.UartConnector({port:port});
        
        
    }else if(connectorType === 'i2c'){
        if(systemType !== 'linux')
            throw new Error(`i2c is not support on ${systemType}`)
        const s = require('../notecard/i2c-connector');
        return new s.I2CConnector()
    }else{
        throw new Error(`Connector type ${connectorType} not recognized`)
    }
}




async function findNotecard(s) {
    notecardUsbParams = {productId: '0001',
                        vendorId: '30A4'
                        }
    const p = await s.FindPort(notecardUsbParams);

    return(p[0]);

}
