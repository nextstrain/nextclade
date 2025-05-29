declare const _default: {
    isWorkerRuntime: () => boolean;
    postMessageToMaster: (message: any, transferList?: Transferable[]) => void;
    subscribeToMasterMessages: (onMessage: (data: any) => void) => () => void;
};
export default _default;
