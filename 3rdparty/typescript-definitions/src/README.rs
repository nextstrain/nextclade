/*!
<div style="float:right; padding-left:2em;">
<img
src="https://raw.githubusercontent.com/arabidopsis/typescript-definitions/master/assets/typescript-definitions.png?raw=true">
</div>

# typescript-definitions

> **Exports serde-serializable structs and enums to Typescript definitions.**

[![](https://img.shields.io/crates/v/typescript-definitions.svg)](https://crates.io/crates/typescript-definitions)
[![](https://docs.rs/typescript-definitions/badge.svg)](https://docs.rs/typescript-definitions)
![License](https://img.shields.io/crates/l/typescript-definitions.svg)


**Good news everyone!** Version 0.1.10 introduces a feature gated option to
generate typescript [type guards](https://www.typescriptlang.org/docs/handbook/advanced-types.html). Now you can:

```typescript
    import {Record, isRecord} from "./server_defs";
    const a: any = JSON.parse(some_string_from_your_server)
    if (isRecord(a)) {
        // all the typescript type checking goodness plus a bit of safety
    } else {
        // something went wrong.
    }
```

See [Type Guards](#type-guards) below.

---
<!-- vscode-markdown-toc -->

* [Motivation 🦀](#Motivation)
	* [example:](#example:)
* [Using `typescript-definitions`](#Usingtypescript-definitions)
	* [Getting the toolchains](#Gettingthetoolchains)
* [Using `type_script_ify`](#Usingtype_script_ify)
* [Features](#Features)
* [Serde attributes.](#Serdeattributes.)
* [typescript-definition attributes](#typescript-definitionattributes)
* [Type Guards](#TypeGuards)
* [Limitations](#Limitations)
	* [Limitations of JSON](#LimitationsofJSON)
	* [Limitations of Generics](#LimitationsofGenerics)
* [Examples](#Examples)
* [Problems](#Problems)
* [Credits](#Credits)
* [License](#License)

<!-- vscode-markdown-toc-config
	numbering=false
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->


---


## <a name='Motivation'></a>Motivation 🦀

Now that rust 2018 has landed there is no question that people should be using rust to write server applications (what are you thinking!).

But generating wasm from rust code to run in the browser is currently much too bleeding edge.

Since javascript will be dominant on the client for the forseeable future there remains the
problem of communicating with your javascript from your rust server.

Fundamental to this is to keep the data types on either side of the connection (http/websocket) in sync.

Typescript is an incremental typing system for javascript that is as almost(!) as tricked as rust... so why not create a typescript definition library based on your rust code?

Please see [Credits](#credits).

`typescript-definitions` (as of 0.1.7) uses `edition=2018` (heh).

### <a name='example:'></a>Example:

```rust
// #[cfg(target_arch="wasm32")]
use wasm_bindgen::prelude::*;

use serde::Serialize;
use typescript_definitions::TypescriptDefinition;

#[derive(Serialize, TypescriptDefinition)]
#[serde(tag = "tag", content = "fields")]
/// Important info about Enum
enum Enum {
    V1 {
        #[serde(rename = "Foo")]
        foo: bool,
    },
    V2 {
        #[serde(rename = "Bar")]
        bar: i64,
        #[serde(rename = "Baz")]
        baz: u64,
    },
    V3 {
        #[serde(rename = "Quux")]
        quux: String,
    },
    #[serde(skip)]
    Internal {
        err: String
    },
}
```

Using [wasm-bindgen](https://rustwasm.github.io/wasm-bindgen/) this will output in your `*.d.ts` definition file:

```typescript
// Important info about Enum
export type Enum =
    | {tag: "V1", fields: { Foo: boolean } }
    | {tag: "V2", fields: { Bar: number, Baz: number } }
    | {tag: "V3", fields: { Quux: string } }
    ;
```

## <a name='Usingtypescript-definitions'></a>Using `typescript-definitions`

> **NB**: please note that these macros - by default - work *only for the debug build* since they  pollute the code with strings and methods all of which are probably not useful in any release (since you are only using them to extract information about your current types from your *code*). In release builds they become no-ops. This means that there is *no cost* to your release exes/libs or to your users by using these macros. Zero cost abstraction indeed. Beautiful.

Also, although you might need nightly to run `wasm-bingen` *your* code can remain stable.

See [features](#features) below if you really want them in your release build.

There is a very small example in the repository that [works for me™](https://github.com/arabidopsis/typescript-definitions/tree/master/example/) if you want to get started.

This crate only exports two derive macros: `TypescriptDefinition` and `TypeScriptify`, a simple
trait `TypeScriptifyTrait` and a (very simple) serializer for byte arrays.

In your crate create a lib target in `Cargo.toml` pointing to your "interfaces"

```toml
[lib]
name = "mywasm" # whatever... you decide
path = "src/interface.rs"
crate-type = ["cdylib"]


[dependencies]
typescript-definitions = "0.1"
serde = { version = "1.0", features = ["derive"] }

[target.wasm32-unknown-unknown.dependencies]
wasm-bindgen = "0.2"

```

Then you can run (see [here](#using-type_script_ify) if you don't want to go near WASM):

```sh
$ WASM32=1 cargo +nightly build --target wasm32-unknown-unknown
$ mkdir pkg
$ wasm-bindgen target/wasm32-unknown-unknown/debug/mywasm.wasm --typescript --out-dir pkg/
$ cat pkg/mywasm.d.ts # here are your definitions
```

What just happened? [This.](https://rustwasm.github.io/wasm-bindgen/reference/attributes/on-rust-exports/typescript_custom_section.html)


> The `WASM32=1` environment variable skirts around issue [#1197](https://github.com/rust-lang/cargo/issues/1197).

### <a name='Gettingthetoolchains'></a>Getting the toolchains

If you don't have these tools then [see here](https://rustwasm.github.io/wasm-bindgen/whirlwind-tour/basic-usage.html) (You might also need to get [rustup](https://rustup.rs) first):

```sh
$ rustup target add wasm32-unknown-unknown --toolchain nightly
$ cargo +nightly install wasm-bindgen-cli
```

or use wasm-pack (the typescript library will be in `pkg/mywasm.d.ts`).

```sh
$ curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
$ WASM32=1 wasm-pack build --dev
$ cat pkg/mywasm.d.ts
```


## <a name='Usingtype_script_ify'></a>Using `type_script_ify`

You can ignore WASM *totally* by deriving using `TypeScriptify`:

```rust
// interface.rs

// wasm_bindgen not needed
// use wasm_bindgen::prelude::*;
use serde::Serialize;
use typescript_definitions::TypeScriptify;

#[derive(Serialize, TypeScriptify)]
pub struct MyStruct {
    v : i32,
}

 // Then in `main.rs` (say) you can generate your own typescript
 // specification using `MyStruct::type_script_ify()`:


// main.rs

// need to pull in trait
use typescript_definitions::TypeScriptifyTrait;

fn main() {
    if cfg!(any(debug_assertions, feature="export-typescript")) {

        println!("{}", MyStruct::type_script_ify());
    };
    // prints "export type MyStruct = { v: number };"
}
```
Use the cfg macro To protect any use of `type_script_ify()` if you need to.

If you have a generic struct such as:

```rust
use serde::Serialize;
use typescript_definitions::TypeScriptify;
#[derive(Serialize, TypeScriptify)]
pub struct Value<T> {
    value: T
}
```

then you need to choose a concrete type to generate the typescript: `Value<i32>::type_script_ify()`. The concrete type doesn't matter as long as it obeys rust restrictions; the output will still be generic `export type Value<T> { value: T }`.

Currently type bounds are discarded in the typescript.

So basically with `TypeScriptify` *you* have to create some binary that, via `println!` or similar statements, will cough up a typescript library file. I guess you have more control here... at the expense of complicating
your `Cargo.toml` file and your code.


## <a name='Features'></a>Features

As we said before `typescript-descriptions` macros pollute your code with static strings and other garbage. Hence, by default, they only *work* in debug mode.


If you actually want `T::type_script_ify()` available in your
release code then change your `Cargo.toml` file to:

```toml
[dependencies.typescript-definitions]
version = "0.1"
features = ["export-typescript"]

## OR

typescript-definitions = { version="0.1",  features=["export-typescript"]  }
```

AFAIK the strings generated by TypescriptDescription don't survive the invocation of `wasm-bindgen` even in debug mode. So your *.wasm files are clean. You still need to add `--features=export-typescript` to generate anything in release mode though.


## <a name='Serdeattributes.'></a>Serde attributes.

See Serde [Docs](https://serde.rs/enum-representations.html#internally-tagged).

`typescript-definitions` tries to adhere to the meaning of serde attributes
like`#[serde(tag="type")]` and `#[serde(tag="tag", content="fields")]`.

Before 0.1.8 we had an implicit default tag of "kind" for enums. Now we don't (although we still have a implicit `transparent` on NewTypes).


Serde attributes understood

* `rename`, `rename_all`:
* `tag`:
* `content`:
* `skip`: (`typescript-definitions` also skips - by default -  PhantomData fields ... sorry ghost who walks)
* serialize_with="typescript_definitions::as_byte_string"
* transparent: NewTypes are automatically transparent. Structs with a single field can be marked transparent.

`serialize_with`, if placed on a `[u8]` or `Vec<u8>` field, will take that field to be a string. (And serde_json will output a `\xdd` encoded string of the array. *or* you can create your own... just ensure to name it `as_byte_string`)

```rust
use serde::Serialize;
use typescript_definitions::{TypeScriptify, TypeScriptifyTrait};

#[derive(Serialize, TypeScriptify)]
struct S {
     #[serde(serialize_with="typescript_definitions::as_byte_string")]
     #[ts(ts_type="string")]
     image : Vec<u8>,
     buffer: &'static [u8],
}

println!("{}", S::type_script_ify());
```

 prints `export type S = { image: string, buffer: number[] };`.

Serde attributes understood but *rejected*:

* `flatten` (this will produce a panic). Probably will never be fixed.

All others are just ignored.

If you have specialized serialization then you
will have to tell `typescript-definitions`
what the result is ... see the next section.


## <a name='typescript-definitionattributes'></a>typescript-definition attributes

There are 2 ways to intervene to correct the
typescript output.

* `ts_as`: a rust path to another rust type
  that this value serializes like:
* `ts_type`: a *typescript* type that should be
used.

e.g. some types, for example `chrono::DateTime`, will serializes themselves in an opaque manner. You need to tell `typescript-definitions`, viz:

```rust
use serde::Serialize;
use typescript_definitions::{TypeScriptify, TypeScriptifyTrait};
// with features=["serde"]
use chrono::{DateTime, Local, Utc};
// with features=["serde-1"]
use arrayvec::ArrayVec;

#[derive(Serialize, TypeScriptify)]
pub struct Chrono {
    #[ts(ts_type="string")]
    pub local: DateTime<Local>,
    #[ts(ts_as="str")]
    pub utc: DateTime<Utc>,
    #[ts(ts_as="[u8]")]
    pub ip4_addr1 : ArrayVec<[u8; 4]>,
    #[ts(ts_type="number[]")]
    pub ip4_addr2 : ArrayVec<[u8; 4]>
}
```

## <a name='TypeGuards'></a>Type Guards

See [type guards](https://www.typescriptlang.org/docs/handbook/advanced-types.html).

`typescript-definitions` type guards provide a fail fast defensive check that a random json object agrees with the layout and types of a given `typescript-definitions`
type.

To enable them change your dependency to:

```toml
typescript-definitions = { version="^0.1.10", features=["type-guards"] }
```

With the feature *on* you can turn guard generation *off* for any struct/enum with the
`#[ts(guard=false)]` attribute.

If your struct has a long list of data as `Vec<data>` then you can prevent a type check of the entire array with a field attribute `#[ts(array_check="first")]`
which will check only the first row.

### Example

```rust
use serde::Serialize;
use typescript_definitions::{TypeScriptify, TypeScriptifyTrait};
#[derive(TypeScriptify)]
pub struct Maybe {
    maybe : Option<String>
}

println!("{}", Maybe::type_script_guard().unwrap());
```

will print (after passing through prettier):

```typescript
export const isMaybe = (obj: any): obj is Maybe => {
  if (obj == undefined) return false;
  if (obj.maybe === undefined) return false;
  {
    const val = obj.maybe;
    if (!(val === null)) {
      if (!(typeof val === "string")) return false;
    }
  }
  return true;
};
```

## <a name='Limitations'></a>Limitations


### <a name='LimitationsofJSON'></a>Limitations of JSON

e.g. Maps with non string keys: This

```rust
use wasm_bindgen::prelude::*;
use serde::Serialize;
use std::collections::HashMap;
use typescript_definitions::TypescriptDefinition;
#[derive(Serialize, TypescriptDefinition)]
pub struct IntMap {
    pub intmap: HashMap<i32, i32>,
}
```

will generate:

```typescript

export type IntMap = { intmap: { [key: number]: number } };
```

But the typescript compiler will type check this:

```typescript
let v : IntMap = { intmap: {  "6": 6, 4: 4 } };
```

So the generated guard also checks for integer keys with `(+key !== NaN)`.

You can short circuit any field with some attribute
markup 

* `ts_type` specify the serialization.
* `ts_guard`: verify the type as if it was this
  typescript type.


### <a name='LimitationsofGenerics'></a>Limitations of Generics

`typescript-definitions` has limited support for verifing generics.

Rust and typescript diverge a lot on what genericity means. Generic Rust structs don't map well to generic typescript types. However we don't give up totally.

This will work:

```rust
use wasm_bindgen::prelude::*;
use serde::Serialize;
use typescript_definitions::TypescriptDefinition;

#[derive(Serialize, TypescriptDefinition)]
pub struct Value<T> {
    pub value: T,
}

#[derive(Serialize, TypescriptDefinition)]
pub struct DependsOnValue {
    pub value: Vec<Value<i32>>,
}
```
Since the monomorphization of `Value` in `DependsOnValue` is one of
`number`, `string` or `boolean`. 

Beyond this you will have to write your own guards e.g.:

```rust
use wasm_bindgen::prelude::*;
use serde::Serialize;
use typescript_definitions::TypescriptDefinition;

#[derive(Serialize, TypescriptDefinition)]
pub struct Value<T> {
    pub value: T,
}

#[derive(Serialize, TypescriptDefinition)]
pub struct DependsOnValue {
    #[ts(ts_guard="{value: number[]}")]
    pub value: Value<Vec<i32>>,
}
```
*OR* you will have to rewrite the generated guard
for generic type `value: T` yourself. viz:

```typescript
const isT = <T>(o: any, typename: string): o is T => {
    // typename is the stringified type that we are
    // expecting e.g. `number` or `{a: number, b: string}[]` etc.
    // 
    if (typename !== "number[]") return false;
    if (!Array.isArray(o)) return false;
    for (let v of o) {
        if (typeof v !== "number") return false;
    }
    return true
}
```

Watch out for function name collisions especially if you use simple names such as `T`, for a generic
type name.

The generated output file should really be passed through something like [prettier](https://www.npmjs.com/package/prettier).

## <a name='Examples'></a>Examples

Top level doc (`///` or `//!` ) comments are converted to javascript (line) comments:

```rust
use serde::Serialize;
use typescript_definitions::{TypeScriptify, TypeScriptifyTrait};
#[derive(Serialize, TypeScriptify)]
/// This is some API Event.
struct Event {
    what : String,
    pos : Vec<(i32,i32)>
}

assert_eq!(Event::type_script_ify(), "\
// This is some API Event.
export type Event = { what: string; pos: [ number , number ][] };"
)
```

## <a name='Problems'></a>Problems

Oh yes there are problems...

Currently `typescript-descriptions` will not fail (AFAIK) even for structs and enums with function pointers `fn(a:A, b: B) -> C` (generates typescript lambda `(a:A, b:B) => C`)
and closures `Fn(A,B) -> C` (generates `(A,B) => C`). These make no sense in the current context (data types, json serialization) so this might be considered a bug.
Watchout!

This might change if use cases show that an error would be better.

If you reference another type in a struct e.g.

```rust
// #[cfg(target_arch="wasm32")]
use wasm_bindgen::prelude::*;
use serde::Serialize;
use typescript_definitions::{TypescriptDefinition};
#[derive(Serialize)]
struct B<T> {q: T}

#[derive(Serialize, TypescriptDefinition)]
struct A {
    x : f64,
    b: B<f64>,
}
```

then this will "work" (producing `export type A = { x: number ,b: B<number> })`) but B will be opaque to
typescript unless B is *also* `#[derive(TypescriptDefinition)]`.

Currently there is no check for this omission.

----

The following types are rendered as:

* `Option<T>` => `T | null` (can't use undefined because this will mess with object checking)
* `HashMap<K,V>` => `{ [key:K]:V }` (same for `BTreeMap`)
* `HashSet<V>` => `V[]` (same for `BTreeSet`)
* `&[u8]` and `Vec<u8>` are expected to be byte buffers but are still rendered as `number[]` since
  this is what `serde_json` does. However you can force the output to be a string using
  `#[serde(serialize_with="typescript_defintions::as_byte_string")]`

An `enum` that is all Unit types such as

```rust
enum Color {
    Red,
    Green,
    Blue
}
```
is rendered as a typescript enum:

```typescript
enum Color {
    Red = "Red",
    Green ="Green",
    Blue = "Blue"
}
```

because serde_json will render `Color::Red` as the string `"Red"` instead of `Color.Red` (because JSON).

Serde always seems to render `Result` (in json) as `{"Ok": T } | {"Err": E}` i.e as "External" so we do too.


Formatting is rubbish and won't pass tslint. This is due to the quote! crate taking control of the output token stream. I don't know what it does with whitespace for example... (is whitespace a token in rust?). Anyhow... this crate applies a few band-aid regex patches to pretty things up. But use
[prettier](https://www.npmjs.com/package/prettier).


We are not as clever as serde or the compiler in determining the actual type. For example this won't "work":

```rust
use std::borrow::Cow as Pig;
use typescript_definitions::{TypeScriptify,TypeScriptifyTrait};

#[derive(TypeScriptify)]
struct S<'a> {
    pig: Pig<'a, str>,
}
println!("{}", S::type_script_ify());
```

gives `export type S = { pig : Pig<string> }` instead of `export type S = { pig : string }`
Use `#[ts(ts_as="Cow")]` to fix this.

At a certain point `typescript-definitions` just *assumes* that the token identifier `i32` (say) *is* really the rust signed 32 bit integer and not some crazy renamed struct in your code!

Complex paths are ignored `std::borrow::Cow` and `mycrate::mod::Cow` are the same to us. We're not going to re-implement the compiler to find out if they are *actually* different. A Cow is always "Clone on write".

We can't reasonably obey serde attributes like "flatten" since we would need to find the *actual* Struct object (from somewhere) and query its fields.


## <a name='Credits'></a>Credits

For initial inspiration see http://timryan.org/2019/01/22/exporting-serde-types-to-typescript.html

Forked from [`wasm-typescript-definition` by @tcr](https://github.com/tcr/wasm-typescript-definition?files=1)
which was forked from [`rust-serde-schema` by @srijs](https://github.com/srijs/rust-serde-schema?files=1).

`type_script_ify` idea from [`typescriptify` by @n3phtys](https://github.com/n3phtys/typescriptify)

Probably some others...

## <a name='License'></a>License

MIT or Apache-2.0, at your option.
*/
