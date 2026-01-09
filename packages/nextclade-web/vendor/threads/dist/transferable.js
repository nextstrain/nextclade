"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTransferDescriptor = isTransferDescriptor;
exports.Transfer = Transfer;
const symbols_1 = require("./symbols");
function isTransferable(thing) {
    if (!thing || typeof thing !== "object")
        return false;
    // Don't check too thoroughly, since the list of transferable things in JS might grow over time
    return true;
}
function isTransferDescriptor(thing) {
    return thing && typeof thing === "object" && thing[symbols_1.$transferable];
}
function Transfer(payload, transferables) {
    if (!transferables) {
        if (!isTransferable(payload))
            throw Error();
        transferables = [payload];
    }
    return {
        [symbols_1.$transferable]: true,
        send: payload,
        transferables
    };
}
