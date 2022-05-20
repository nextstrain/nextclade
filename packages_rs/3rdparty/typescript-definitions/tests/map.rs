#![allow(unused)]

use typescript_definitions::{TypeScriptify, TypeScriptifyTrait, TypescriptDefinition};

use serde::Serialize;
// use serde::de::value::Error;
use insta::assert_snapshot_matches;
use wasm_bindgen::prelude::*;

#[test]
fn as_byte_string() {
    use serde_json;

    #[derive(Serialize, TypeScriptify)]
    struct S {
        #[serde(serialize_with = "typescript_definitions::as_byte_string")]
        image: Vec<u8>,
    }

    let s = S {
        image: vec![1, 2, 3, 4, 5, 244],
    };
    assert_snapshot_matches!(
        serde_json::to_string(&s).unwrap(),
        @r###"{"image":"\\x01\\x02\\x03\\x04\\x05\\xf4"}"###

    )
}

#[test]
fn untagged_enum() {
    #[derive(Serialize, TypeScriptify)]
    #[serde(untagged)]
    enum Untagged {
        V1 { id: i32, attr: String },
        V2 { id: i32, attr2: Vec<String> },
    }

    assert_snapshot_matches!(
        Untagged::type_script_ify(),
        @r###"export type Untagged = 
 | { id: number; attr: string } 
 | { id: number; attr2: string[] };"###

    )
}

#[test]
fn external_enum() {
    #[derive(Serialize, TypeScriptify)]
    /// Has documentation.
    enum External {
        V1 { id: i32, attr: String },
        V2 { id: i32, attr2: Vec<String> },
    }

    assert_snapshot_matches!(
    External::type_script_ify(),
        @r###"// Has documentation.
export type External = 
 | { V1: { id: number; attr: string } } 
 | { V2: { id: number; attr2: string[] } };"###
    )
}

#[test]
fn where_clause_ok() {
    #[derive(TypeScriptify)]
    struct Where<T>
    where
        T: Copy,
    {
        a: i32,

        b: T,
    }

    assert_snapshot_matches!(
        Where::<i32>::type_script_ify(),
        @"export type Where<T> = { a: number; b: T };"

    )
}

#[test]
fn fullpath_chrono() {
    use chrono;
    #[derive(TypeScriptify)]
    struct Where<T>
    where
        T: Copy,
    {
        datetime: chrono::DateTime<chrono::Local>,

        b: T,
    }

    assert_snapshot_matches!(
        Where::<i32>::type_script_ify(),
        @"export type Where<T> = { datetime: string; b: T };"

    )
}
#[test]
fn check_ts_as() {
    #[derive(TypeScriptify)]
    struct Sub {
        #[ts(ts_as = "Vec<u8>")]
        b: i32,
    }

    assert_snapshot_matches!(
        Sub::type_script_ify(),
        @"export type Sub = { b: number[] };"

    );
}
