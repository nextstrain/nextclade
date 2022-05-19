#![allow(unused)]

use serde::Serialize;
use typescript_definitions::{TypeScriptify, TypescriptDefinition};


#[cfg(target_arch="wasm32")]
use wasm_bindgen::prelude::*;

#[derive(Serialize, TypescriptDefinition, TypeScriptify)]
pub struct Newtype( pub i64);

#[derive(Serialize, TypescriptDefinition, TypeScriptify, Debug)]
pub struct Point {
    #[serde(rename = "X")]
    pub x: i64,
    #[serde(rename = "Y")]
    pub y: i64,
    pub z: i64,
}

#[derive(Serialize, TypescriptDefinition, TypeScriptify)]
pub enum Enum {
    #[allow(unused)]
    V1 {
        #[serde(rename = "Foo")]
        foo: bool,
    },
    #[allow(unused)]
    V2 {
        #[serde(rename = "Bar")]
        bar: i64,
        #[serde(rename = "Baz")]
        baz: u64,
    },
    #[allow(unused)]
    V3 {
        #[serde(rename = "Quux")]
        quux: String,
    },
}

#[derive(Serialize, TypescriptDefinition, TypeScriptify)]
pub struct Value<T : ToString> {
    value: T,
}

#[derive(TypescriptDefinition, Serialize, TypeScriptify)]
#[serde(tag = "tag", content = "fields")]
#[ts(guard = "true")]
/// This is some API Event.
pub enum FrontendMessage {
    Init {
        id: String,
    },
    ButtonState {
        selected: Vec<String>,
        time: u32,
        other: Option<String>,
    },
    Render {
        html: String,
        time: u32,
        other_result: Result<&'static str, i32>,
    },
    Stuff {
        borrow: Value<i32>,
    },
}

use std::borrow::Cow;
use std::collections::HashMap;

#[derive(Serialize, TypescriptDefinition, TypeScriptify)]
#[ts(guard)]
pub struct Borrow<'a> {
    raw: &'a str,
    cow: Cow<'a, str>,
    map: HashMap<String, i32>,
    pub array: Vec<String>,
}

#[derive(Serialize, TypescriptDefinition, TypeScriptify)]
pub struct MyBytes {
    #[serde(serialize_with = "typescript_definitions::as_byte_string")]
    pub buffer: Vec<u8>,

}
#[derive(Serialize, TypescriptDefinition)]
#[serde(tag = "kind", content = "fields")]
enum S {
    A,
    E2 {
        key: i32,
        a: i32,
        #[serde(skip)]
        b: f64,
    },
    F(i32, #[serde(skip)] f64, String),
    #[serde(skip)]
    Z,
}
