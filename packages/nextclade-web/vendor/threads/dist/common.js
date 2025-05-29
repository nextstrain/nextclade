"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSerializer = registerSerializer;
exports.deserialize = deserialize;
exports.serialize = serialize;
const serializers_1 = require("./serializers");
let registeredSerializer = serializers_1.DefaultSerializer;
function registerSerializer(serializer) {
    registeredSerializer = (0, serializers_1.extendSerializer)(registeredSerializer, serializer);
}
function deserialize(message) {
    return registeredSerializer.deserialize(message);
}
function serialize(input) {
    return registeredSerializer.serialize(input);
}
