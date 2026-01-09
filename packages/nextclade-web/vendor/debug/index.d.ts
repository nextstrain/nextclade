declare module 'debug' {
  interface Debug {
    (): Debug;
    log: Debug;
    info: Debug;
    warn: Debug;
    error: Debug;
    enabled: boolean;
    disable: () => void;
    enable: () => void;
    destroy: () => void;
  }
  const debug: Debug;
  export default debug;
}
