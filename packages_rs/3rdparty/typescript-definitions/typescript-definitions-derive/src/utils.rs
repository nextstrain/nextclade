// Copyright 2019 Ian Castleden
//
// Licensed under the Apache License, Version 2.0 <LICENSE-APACHE or
// http://www.apache.org/licenses/LICENSE-2.0> or the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>, at your
// option. This file may not be copied, modified, or distributed
// except according to those terms.
use super::ast;
use proc_macro2::{Ident, Span};

pub fn ident_from_str(s: &str) -> Ident {
    syn::Ident::new(s, Span::call_site())
}

pub fn field_type_name(ty: &syn::Type) -> Option<String> {
    use syn::Type::Path;
    match ty {
        Path(syn::TypePath { path, .. }) => match path.segments.last().map(|p| p.into_value()) {
            Some(t) => Some(t.ident.to_string()),
            _ => None,
        },
        _ => None,
    }
}

pub fn is_bytes<'a>(field: &ast::Field<'a>) -> bool {
    // check for #[serde(with="serde_bytes")]
    use syn::ExprPath;
    if let Some(ExprPath { ref path, .. }) = field.attrs.serialize_with() {
        match path.segments.last().map(|p| p.into_value()) {
            Some(t) => return t.ident == "as_byte_string",
            _ => return false,
        }
    };
    false
}

#[allow(unused)]
pub fn full_field_type_name(ty: &syn::Type) -> Option<Vec<Ident>> {
    use syn::Type::Path;
    match ty {
        Path(syn::TypePath { path, .. }) => {
            Some(path.segments.iter().map(|p| p.ident.clone()).collect())
        }
        _ => None,
    }
}

pub fn is_phantom(ty: &syn::Type) -> bool {
    match field_type_name(ty) {
        Some(t) => t == "PhantomData",
        _ => false,
    }
}

pub fn filter_visible<'a>(fields: &'a [ast::Field<'a>]) -> Vec<&'a ast::Field<'a>> {
    let mut content: Vec<&'a ast::Field<'a>> = Vec::with_capacity(fields.len());

    for field in fields {
        if field.attrs.skip_serializing() || is_phantom(field.ty) {
            continue;
        }

        content.push(field);
    }
    content
}

const GUARD_PREFIX: &str = "is";

pub fn guard_name(ident: &Ident) -> Ident {
    let mut s = String::new();
    s.push_str(GUARD_PREFIX);
    s.push_str(&ident.to_string());
    ident_from_str(&s)
}
