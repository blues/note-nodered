var SerialPort = require("serialport");


function FindPort(searchParams){

    caseInsensitiveEqual = (a,b) => {
        return (typeof a === 'string' && typeof b === 'string'
        ? a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0
        : a === b);
    }

    hasAllParams = (p) => {
        for(f in searchParams){
            if(!p.hasOwnProperty(f) || !caseInsensitiveEqual(p[f],searchParams[f]))
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

async function FindNotecardSerial(){
    const params = {productId: '0001',
                    vendorId: '30A4'
                   };
    const usbPorts = await FindPort(params);
    let ports = [];
    usbPorts.forEach(p => {
        ports.push({name:p, isNotecard:true, baudrate:9600})
        
    });

    const allPorts = await FindPort();

    const difference = allPorts.filter(x => !usbPorts.includes(x));

    difference.forEach(p => {
        ports.push({name:p, isNotecard:false, baudrate:null})
    })

    return ports
}

function setSerialPortDriver(driver){
    SerialPort = driver;
}

module.exports = {FindNotecardSerial, FindPort, setSerialPortDriver};
