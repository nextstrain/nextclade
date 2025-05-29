import { Observable } from "observable-fns";
import { Thread as ThreadType, WorkerEvent } from "../types/master";
export type Thread = ThreadType;
/** Thread utility functions. Use them to manage or inspect a `spawn()`-ed thread. */
export declare const Thread: {
    /** Return an observable that can be used to subscribe to all errors happening in the thread. */
    errors<ThreadT extends ThreadType>(thread: ThreadT): Observable<Error>;
    /** Return an observable that can be used to subscribe to internal events happening in the thread. Useful for debugging. */
    events<ThreadT extends ThreadType>(thread: ThreadT): Observable<WorkerEvent>;
    /** Terminate a thread. Remember to terminate every thread when you are done using it. */
    terminate<ThreadT extends ThreadType>(thread: ThreadT): Promise<void>;
};
