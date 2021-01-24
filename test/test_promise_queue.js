const assert = require('assert');
const sinon = require('sinon');

const queue = require('../notecard/promise-queue.js');


describe('PromiseQueue', () => {
    describe('add', () => {

        it('should add promise-generator to queue and execute the generator', async () => {
            const q = new queue.PromiseQueue();
            const spy = sinon.spy();
            
            const generator = async () => {
                spy();
                return (3.14)
            };
            
            const result = await q.add(generator);
            
            assert.ok(spy.calledOnce);
            assert.equal(result, 3.14);

            
        });

        it('should throw error if input argument is a promise', () => {
            const q = new queue.PromiseQueue();
            const generator = new Promise((resolve, reject) => resolve(true));

            assert.throws(
                () => {
                  q.add(generator);
                },
                {
                  name: 'TypeError',
                  message: 'Input argument must be a function'
                }
            );
        });

        it('should use queue fifo to order promises ', async () => {
            const q = new queue.PromiseQueue();
            const spies = [ sinon.spy(), sinon.spy()];
            const f = async (s) => s();
            const generators = [
                                () => {return f(spies[0])}, 
                                () => {return f(spies[1])}
                               ];
            
            q.add(generators[0]);
            await q.add(generators[1]);

            assert(spies[0].calledBefore(spies[1]));
        });

        it('should use queue fifo to order promises with intermediate async function', async () => {
            const q = new queue.PromiseQueue();
            const spies = [ sinon.spy(), sinon.spy()];
            const f = async (s) => {s(); return(true);};
            const generators = [
                                () => {return f(spies[0])}, 
                                () => {return f(spies[1])}
                               ];
            const a = async (n) => {
                const r = await generators[n]()
                return r;
            }
            q.add(() => {return a(0)});
            await q.add(() => {return a(1)});

            assert(spies[0].calledBefore(spies[1]));
        });
    });

    describe('clear', () => {
        it('should reject all promises waiting for the queue', async () => {
            const q = new queue.PromiseQueue();

            var doResolve;

            const g = () => {
                return new Promise((resolve, reject) => {
                    doResolve = () => resolve('done');
                })
            }

            const f = () => {};
            var numErrorChecks = 0;
            const checkError = (e) => {
                numErrorChecks++;
                assert.equal(e.message, 'flushing queue')
            };

            const p1 = q.add(g).catch((err)=> checkError(err)).then(()=> assert.fail('hello'));
            const p2 = q.add(f).catch((err)=> checkError(err)).then(()=> assert.fail('i'));
            const p3 = q.add(f);

            q.clear();
            try{
                await(p3);
            }catch(err){
                checkError(err);
            }

            assert.strictEqual(numErrorChecks, 3, 'Did not do enough error checks to see if all promises were rejected')

        })
    });
});


