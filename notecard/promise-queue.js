

class PromiseQueue {
    pending = false;
    _queue = [];

    add(p){ return this.enqueue(p)}

    enqueue(promise) {
        const f = (resolve, reject) => {
            this._queue.push({promise, resolve, reject});
            this.dequeue();
        };

        return new Promise(f);
    }

    dequeue () {
        if(this.pending){
            return false;
        }

        const next = this._queue.shift();
        if (!next) {
            return false;
        }
        
        this.pending = true;
        next.promise
            .then( v => next.resolve(v))
            .catch( err => next.reject(err))
            .finally( () => {
                this.pending = false;
                this.dequeue();
            });
    }
}


module.exports = {PromiseQueue};