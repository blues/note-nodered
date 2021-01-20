class BufferReadWriter {
    readBuffer;
    readBufferIndex = 0;
    writeBuffer;
    writeBufferIndex = 0;

    constructor (readBufferSize = 0, writeBufferSize = 0){
        this.readBuffer = Buffer.alloc(readBufferSize);
        this.writeBuffer = Buffer.alloc(writeBufferSize);
    }

    read(numBytes){
        if(!numBytes){
            return this.readBuffer.slice(this.readBufferIndex);
        }

        var newIndex = this.readBufferIndex + numBytes;
        newIndex = (newIndex > this.readBuffer.length) ? this.readBuffer.length : newIndex;
        var slice = this.readBuffer.slice(this.readBufferIndex, newIndex);
        this.readBufferIndex = newIndex;

        return slice;
    }

    write(inputBuffer){
        var numBytes = inputBuffer.length;
        var newIndex = this.writeBufferIndex + numBytes;
        newIndex = (newIndex > this.writeBuffer.length) ? this.writeBuffer.length : newIndex;

        inputBuffer.copy(this.writeBuffer, this.writeBufferIndex);
        this.writeBufferIndex = newIndex;
    }

    reset(){
        this.readBufferIndex = 0;
        this.writeBufferIndex = 0;
        this.readBuffer.fill(0);
        this.writeBuffer.fill(0);
    }
}

class InMemTransactor {

    rw;
    isOpen = false;

    constructor(readWriter = new BufferReadWriter()){
        this.rw = readWriter;
    }


    async open() {
        this.isOpen = true;

    }

    async close() {
        this.isOpen = false;
    }


    async doTransaction(messageBuffer){
        if(!this.isOpen){
            throw new Error("Transactor is not open")
        }

        this.rw.write(messageBuffer);

        return(this.rw.read());

    }

    async reset(){
        if(!this.isOpen){
            throw new Error("Transactor is not open")
        }
        this.rw.reset();
    }
}

module.exports = {InMemTransactor, BufferReadWriter};