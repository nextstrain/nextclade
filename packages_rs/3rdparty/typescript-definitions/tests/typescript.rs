#![allow(unused)]

use typescript_definitions::{TypeScriptify, TypeScriptifyTrait, TypescriptDefinition};

use serde::Serialize;
use std::borrow::Cow;
// use serde::de::value::Error;

use insta::assert_snapshot_matches;
use wasm_bindgen::prelude::*;

#[cfg(feature = "test")]
#[test]
fn unit_struct() {
    #[derive(Serialize, TypescriptDefinition)]
    struct Unit;

    assert_snapshot_matches!(Unit___typescript_definition(),@"export type Unit = {};")
}
#[cfg(feature = "test")]
#[test]
fn newtype_struct() {
    #[derive(Serialize, TypescriptDefinition)]
    struct Newtype(i64);

    assert_snapshot_matches!(
        Newtype___typescript_definition(),
        @"export type Newtype = number;"
    )
}
#[cfg(feature = "test")]
#[test]
fn tuple_struct() {
    #[derive(Serialize, TypescriptDefinition)]
    struct Tuple(i64, String);

    assert_snapshot_matches!(
        Tuple___typescript_definition(),
        @"export type Tuple = [ number , string ];"
    )
}
#[cfg(feature = "test")]
#[test]
fn struct_with_borrowed_fields() {
    #[derive(Serialize, TypescriptDefinition, TypeScriptify)]
    struct Borrow<'a> {
        raw: &'a str,
        cow: Cow<'a, str>,
    }

    assert_snapshot_matches!(
        Borrow___typescript_definition(),
        @"export type Borrow = { raw: string; cow: string };"
    )
}
#[cfg(feature = "test")]
#[test]
fn struct_point_with_field_rename() {
    #[derive(Serialize, TypescriptDefinition)]
    struct Point {
        #[serde(rename = "X")]
        x: i64,
        #[serde(rename = "Y")]
        y: i64,
    }

    assert_snapshot_matches!(
        Point___typescript_definition(),
        @"export type Point = { X: number; Y: number };"

    )
}
#[cfg(feature = "test")]
#[test]
fn struct_with_array() {
    #[derive(Serialize, TypescriptDefinition)]
    struct Point {
        x: [i64; 5],
        y: i64,
        z: Option<f64>,
    }

    assert_snapshot_matches!(
        Point___typescript_definition(),
        @"export type Point = { x: number[]; y: number; z: number | null };"

    )
}
#[cfg(feature = "test")]
#[test]
fn struct_with_tuple() {
    use std::collections::{HashMap, HashSet};

    #[derive(Serialize, TypescriptDefinition)]
    struct Point2 {
        x: (i64, String, [u128; 5]),
        y: i64,
        v: Vec<i32>,
        z: HashMap<String, i32>,
    }

    assert_snapshot_matches!(
        Point2___typescript_definition(),
        @"export type Point2 = { x: [ number , string , number[] ]; y: number; v: number[]; z: { [ key: string ]: number } };"

    )
}
#[cfg(feature = "test")]
#[test]
fn enum_with_renamed_newtype_variants() {
    #[derive(Serialize, TypescriptDefinition)]
    #[serde(tag = "kind")]
    enum Enum {
        #[serde(rename = "Var1")]
        V1(bool),
        #[serde(rename = "Var2")]
        V2(i64),
        #[serde(rename = "Var3")]
        V3(String),
        #[serde(skip)]
        Internal(i32),
    }

    assert_snapshot_matches!(
        Enum___typescript_definition(),
        @r###"export type Enum = 
 | { kind: "Var1"; fields: boolean } 
 | { kind: "Var2"; fields: number } 
 | { kind: "Var3"; fields: string };"###

    )
}
#[cfg(feature = "test")]
#[test]
fn enum_with_unit_variants() {
    #[derive(Serialize, TypescriptDefinition)]
    enum Enum {
        V1,
        V2,
        V3,
    }

    assert_snapshot_matches!(
        Enum___typescript_definition(),
        @r###"export enum Enum { V1 = "V1" , V2 = "V2" , V3 = "V3" };"###
    )
}
#[cfg(feature = "test")]
#[test]
fn enum_with_tuple_variants() {
    #[derive(Serialize, TypescriptDefinition)]
    #[serde(tag = "kind", content = "fields")]
    enum Enum {
        V1(i64, String),
        V2(i64, bool),
        V3(i64, u64),
    }

    assert_snapshot_matches!(
    Enum___typescript_definition(),
        @r###"export type Enum = 
 | { kind: "V1"; fields: [ number , string ] } 
 | { kind: "V2"; fields: [ number , boolean ] } 
 | { kind: "V3"; fields: [ number , number ] };"###
    )
}
#[cfg(feature = "test")]
#[test]
fn enum_with_struct_variants_and_renamed_fields() {
    #[derive(Serialize, TypescriptDefinition)]
    #[serde(tag = "kind")]
    enum Enum {
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

    assert_snapshot_matches!(
        Enum___typescript_definition(),
        @r###"export type Enum = 
 | { kind: "V1"; Foo: boolean } 
 | { kind: "V2"; Bar: number; Baz: number } 
 | { kind: "V3"; Quux: string };"###

    )
}
#[cfg(feature = "test")]
#[test]
fn enum_with_struct_and_tags() {
    #[derive(Serialize, TypescriptDefinition)]
    #[serde(tag = "id", content = "content")]
    enum Enum {
        V1 { foo: bool },
        V2 { bar: i64, baz: u64 },
        V3 { quux: String },
    }

    assert_snapshot_matches!(
        Enum___typescript_definition(),
        @r###"export type Enum = 
 | { id: "V1"; content: { foo: boolean } } 
 | { id: "V2"; content: { bar: number; baz: number } } 
 | { id: "V3"; content: { quux: string } };"###

    )
}
#[cfg(feature = "test")]
#[test]
fn struct_with_attr_refering_to_other_type() {
    #[derive(Serialize)]
    struct B<T> {
        q: T,
    }

    #[derive(Serialize, TypescriptDefinition)]
    struct A {
        x: f64, /* simple */
        b: B<f64>,
        #[serde(rename = "cnew")]
        c: Result<i32, &'static str>,
        d: Result<Option<i32>, String>,
    }
    assert_snapshot_matches!(
        A___typescript_definition(),
        @"export type A = { x: number; b: B<number>; cnew: { Ok: number } | { Err: string }; d: { Ok: number | null } | { Err: string } };"
    )
}

#[test]
fn struct_typescriptify() {
    #[derive(TypeScriptify)]
    struct A {
        x: f64, /* simple */
        c: Result<i32, &'static str>,
        d: Result<Option<i32>, String>,
    }
    assert_snapshot_matches!(
        A::type_script_ify(),
        @"export type A = { x: number; c: { Ok: number } | { Err: string }; d: { Ok: number | null } | { Err: string } };"
    )
}

#[test]
fn cow_as_pig() {
    use std::borrow::Cow as Pig;

    #[derive(TypeScriptify)]
    struct S<'a> {
        pig: Pig<'a, str>,
        cow: ::std::borrow::Cow<'a, str>,
    }
    assert_snapshot_matches!(
        S::type_script_ify(),
        @"export type S = { pig: Pig<string>; cow: string };"
    )
}

#[test]
fn unit_enum_is_enum() {
    #[derive(TypeScriptify)]
    enum Color {
        Red,
        Green,
        Blue,
    }
    assert_snapshot_matches!(
        Color::type_script_ify(),
        @r###"export enum Color { Red = "Red" , Green = "Green" , Blue = "Blue" };"###

    )
}

#[test]
fn struct_has_function() {
    #[derive(TypeScriptify)]
    struct API<T> {
        key: i32,
        a: T,
        get: fn(arg: &i32) -> String,
        get2: Fn(T, i32) -> Option<i32>,
    }
    assert_snapshot_matches!(
        API::<i32>::type_script_ify(),
        @"export type API<T> = { key: number; a: T; get: ( arg: number ) => string; get2: ( T , number ) => number | null };"
    )
}

#[test]
fn struct_with_traitbounds() {
    use std::fmt::Display;

    #[derive(TypeScriptify)]
    struct API<T: Display + Send> {
        key: i32,
        a: T,
    }
    assert_snapshot_matches!(
        API::<i32>::type_script_ify(),
        @"export type API<T> = { key: number; a: T };"

    )
}
#[test]
fn struct_with_serde_skip() {
    #[derive(Serialize, TypeScriptify)]
    struct S {
        key: i32,
        aa: i32,
        #[serde(skip)]
        b: f64,
    }
    assert_snapshot_matches!(
        S::type_script_ify(),
        @"export type S = { key: number; aa: number };"


    )
}
#[test]
fn enum_with_serde_skip() {
    #[derive(Serialize, TypeScriptify)]
    #[serde(tag = "kind", content = "fields")]
    enum S {
        A,
        E {
            key: i32,
            a: i32,
            #[serde(skip)]
            b: f64,
        },
        F(i32, #[serde(skip)] f64, String),
        #[serde(skip)]
        Z,
    }
    assert_snapshot_matches!(
    S::type_script_ify(),
        @r###"export type S = 
 | { kind: "A" } 
 | { kind: "E"; fields: { key: number; a: number } } 
 | { kind: "F"; fields: [ number , string ] };"###
    )
}

#[test]
fn struct_with_phantom_data_skip() {
    use std::marker::PhantomData;

    #[derive(Serialize, TypeScriptify)]
    struct S {
        key: i32,
        a: i32,
        b: PhantomData<String>,
    }
    assert_snapshot_matches!(
        S::type_script_ify(),
        @"export type S = { key: number; a: number };"
    )
}
#[cfg(feature = "test")]
#[test]
fn struct_with_pointers_and_slices() {
    #[derive(Serialize, TypescriptDefinition)]
    /// This is a doc comment
    /// on multiple lines.
    struct Pointers<'a> {
        keys: &'a [String],
        // a_ptr: * const i32,
        // #[serde(with="serde_bytes")]
        buffer: &'a [u8],
        buffer2: Vec<u8>,
    }

    assert_snapshot_matches!(
        Pointers___typescript_definition(),
        @r###"// This is a doc comment
// on multiple lines.
export type Pointers = { keys: string[]; buffer: number[]; buffer2: number[] };"###

    )
}
#[cfg(feature = "test")]
#[test]
fn struct_with_one_field_is_transparent() {
    #[derive(Serialize, TypescriptDefinition)]
    #[serde(transparent)]
    struct One {
        a: i32,
    }

    assert_snapshot_matches!(
        One___typescript_definition(),
        @"export type One = number;"

    )
}

#[cfg(feature = "test")]
#[test]
fn struct_with_two_fields_is_transparent_with_skip() {
    #[derive(Serialize, TypescriptDefinition)]
    #[serde(transparent)]
    struct TwoSkip {
        a: i32,
        #[serde(skip)]
        b: i32,
    }

    assert_snapshot_matches!(
        TwoSkip___typescript_definition(),
        @"export type TwoSkip = number;"

    )
}
