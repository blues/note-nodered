

class PromiseQueue {
    pending = null;
    _queue = [];
    _next = null;

    push(obj) {
        this._queue.push(obj);
    }

    shift() {
        return this._queue.shift();
    }

    add(g) { 
        return this.enqueue(g)
    }

    enqueue(promiseGenerator) {
        if(typeof promiseGenerator !== 'function') {
            const err = new TypeError('Input argument must be a function');
            throw(err);
        }
        const f = (resolve, reject) => {
            this.push({promiseGenerator, resolve, reject});
            this.dequeue();
        };

        return new Promise(f);
    }

    dequeue () {
        if(this.pending){
            return false;
        }

        const next = this.shift();
        if (!next) {
            return false;
        }
        
        this.pending = next;
        const promise = next.promiseGenerator();
        promise
            .then( v => next.resolve(v))
            .catch( err => next.reject(err))
            .finally( () => {
                this.pending = null;
                this.dequeue();
            });
    }

    async clear () {
        if(this.pending){
            this.pending.reject(new Error('flushing queue'));
        }
        this._queue.forEach((v) => {
            v.reject(new Error('flushing queue'))
        });
        
    }
}


module.exports = {PromiseQueue};