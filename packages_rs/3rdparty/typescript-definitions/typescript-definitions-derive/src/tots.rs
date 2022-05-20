// Copyright 2019 Ian Castleden
//
// Licensed under the Apache License, Version 2.0 <LICENSE-APACHE or
// http://www.apache.org/licenses/LICENSE-2.0> or the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>, at your
// option. This file may not be copied, modified, or distributed
// except according to those terms.
use super::{
    ident_from_str, is_bytes, last_path_element, return_type, FieldContext, QuoteT, TSType,
};
use proc_macro2::Ident;
use quote::quote;

impl<'a> FieldContext<'a> {
    #[allow(clippy::cyclomatic_complexity)]
    fn generic_to_ts(&self, ts: &TSType) -> QuoteT {
        let to_ts = |ty: &syn::Type| self.type_to_ts(ty);
        let name = ts.ident.to_string();
        match name.as_ref() {
            "u8" | "u16" | "u32" | "u64" | "u128" | "usize" | "i8" | "i16" | "i32" | "i64"
            | "i128" | "isize" | "f64" | "f32" => quote! { number },
            "String" | "str" | "char" | "Path" | "PathBuf" => quote! { string },
            "bool" => quote! { boolean },
            "Box" | "Cow" | "Rc" | "Arc" | "Cell" | "RefCell" if ts.args.len() == 1 => {
                to_ts(&ts.args[0])
            }
            "Duration" => quote! ({ secs: number, nanos: number }),
            "SystemTime" => quote! ({
                secs_since_epoch: number,
                nanos_since_epoch: number
            }),
            // std::collections
            "Vec" | "VecDeque" | "LinkedList" if ts.args.len() == 1 => {
                self.type_to_array(&ts.args[0])
            }
            "HashMap" | "BTreeMap" if ts.args.len() == 2 => {
                let k = to_ts(&ts.args[0]);
                let v = to_ts(&ts.args[1]);
                // quote!(Map<#k,#v>)
                quote!( { [key: #k]:#v } )
            }
            "HashSet" | "BTreeSet" if ts.args.len() == 1 => {
                let k = to_ts(&ts.args[0]);
                //quote!(Set<#k>)
                quote! ( #k[] )
            }
            "Option" if ts.args.len() == 1 => {
                let k = to_ts(&ts.args[0]);
                quote!(  #k | null  )
            }
            "Result" if ts.args.len() == 2 => {
                let k = to_ts(&ts.args[0]);
                let v = to_ts(&ts.args[1]);
                quote!(  { Ok : #k } | { Err : #v }  )
            }
            "Either" if ts.args.len() == 2 => {
                let k = to_ts(&ts.args[0]);
                let v = to_ts(&ts.args[1]);
                quote!(  { Left : #k } | { Right : #v }  )
            }
            "Fn" | "FnOnce" | "FnMut" => {
                let args = self.derive_syn_types(&ts.args);
                if let Some(ref rt) = ts.return_type {
                    let rt = to_ts(rt);
                    quote! { (#(#args),*) => #rt }
                } else {
                    quote! { (#(#args),*) => undefined }
                }
            }
            _ => {
                let owned = ts.path();
                let path: Vec<&str> = owned.iter().map(|s| s.as_ref()).collect();
                match path[..] {
                    ["chrono", "DateTime"] => quote!(string),
                    _ => {
                        let ident = &ts.ident;
                        if !ts.args.is_empty() {
                            let args = self.derive_syn_types(&ts.args);
                            quote! { #ident<#(#args),*> }
                        } else {
                            quote! {#ident}
                        }
                    }
                }
            }
        }
    }

    fn type_to_array(&self, elem: &syn::Type) -> QuoteT {
        // check for [u8] or Vec<u8>

        if let Some(ty) = self.get_path(elem) {
            if ty.ident == "u8" && is_bytes(&self.field) {
                return quote!(string);
            };
        };

        let tp = self.type_to_ts(elem);
        quote! { #tp[] }
    }
    /// # convert a `syn::Type` rust type to a
    /// `TokenStream` of typescript type: basically i32 => number etc.
    ///
    /// field is the current Field for which we are trying a conversion
    pub fn type_to_ts(&self, ty: &syn::Type) -> QuoteT {
        // `type_to_ts` recursively calls itself occationally
        // finding a Path which it hands to last_path_element
        // which generates a "simplified" TSType struct which
        // is handed to `generic_to_ts` which possibly "bottoms out"
        // by generating tokens for typescript types.

        use syn::Type::*;
        use syn::{
            BareFnArgName, TypeArray, TypeBareFn, TypeGroup, TypeImplTrait, TypeParamBound,
            TypeParen, TypePath, TypePtr, TypeReference, TypeSlice, TypeTraitObject, TypeTuple,
        };
        match ty {
            Slice(TypeSlice { elem, .. })
            | Array(TypeArray { elem, .. })
            | Ptr(TypePtr { elem, .. }) => self.type_to_array(elem),
            Reference(TypeReference { elem, .. }) => self.type_to_ts(elem),
            // fn(a: A,b: B, c:C) -> D
            BareFn(TypeBareFn { output, inputs, .. }) => {
                let mut args: Vec<Ident> = Vec::with_capacity(inputs.len());
                let mut typs: Vec<&syn::Type> = Vec::with_capacity(inputs.len());

                for (idx, t) in inputs.iter().enumerate() {
                    let i = match t.name {
                        Some((ref n, _)) => match n {
                            BareFnArgName::Named(m) => m.clone(),
                            _ => ident_from_str("_"), // Wild token '_'
                        },
                        _ => ident_from_str(&format!("_dummy{}", idx)),
                    };
                    args.push(i);
                    typs.push(&t.ty); // TODO: check type is known
                }
                // typescript lambda (a: A, b:B) => C

                // let typs = typs.iter().map(|ty| self.type_to_ts(ty));
                let typs = self.derive_syn_types_ptr(&typs);
                if let Some(ref rt) = return_type(&output) {
                    let rt = self.type_to_ts(rt);
                    quote! { ( #(#args: #typs),* ) => #rt }
                } else {
                    quote! { ( #(#args: #typs),* ) => undefined}
                }
            }
            Never(..) => quote! { never },
            Tuple(TypeTuple { elems, .. }) => {
                let elems = elems.iter().map(|t| self.type_to_ts(t));
                quote!([ #(#elems),* ])
            }

            Path(TypePath { path, .. }) => match last_path_element(&path) {
                Some(ref ts) => self.generic_to_ts(ts),
                _ => quote! { any },
            },
            TraitObject(TypeTraitObject { bounds, .. })
            | ImplTrait(TypeImplTrait { bounds, .. }) => {
                let elems = bounds
                    .iter()
                    .filter_map(|t| match t {
                        TypeParamBound::Trait(t) => last_path_element(&t.path),
                        _ => None, // skip lifetime etc.
                    })
                    .map(|t| self.generic_to_ts(&t));

                // TODO check for zero length?
                // A + B + C => A & B & C
                quote!(#(#elems)&*)
            }
            Paren(TypeParen { elem, .. }) | Group(TypeGroup { elem, .. }) => {
                let tp = self.type_to_ts(elem);
                quote! { ( #tp ) }
            }
            Infer(..) | Macro(..) | Verbatim(..) => quote! { any },
        }
    }
    pub fn derive_syn_types_ptr(
        &'a self,
        types: &'a [&'a syn::Type],
    ) -> impl Iterator<Item = QuoteT> + 'a {
        types.iter().map(move |ty| self.type_to_ts(ty))
    }
    pub fn derive_syn_types(&'a self, types: &'a [syn::Type]) -> impl Iterator<Item = QuoteT> + 'a {
        types.iter().map(move |ty| self.type_to_ts(ty))
    }
}
