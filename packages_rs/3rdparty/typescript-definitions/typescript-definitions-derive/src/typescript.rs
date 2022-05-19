#![allow(unused)]

use super::patch::{eq, nl};
use failure::{Error, Fail};
use pest::iterators::Pair;
use pest::Parser;
use pest_derive::Parser;
use proc_macro2::Literal;
use proc_macro2::TokenStream;
use quote::quote;

use proc_macro2::{Ident, Span};

pub fn ident_from_str(s: &str) -> Ident {
    syn::Ident::new(s, Span::call_site())
}

#[derive(Fail, Debug)]
#[fail(display = "{}", _0)]
pub struct TypescriptParseError(pest::error::Error<Rule>);

impl TypescriptParseError {
    /// Return the column of where the error ocurred.
    #[allow(unused)]
    pub fn column(&self) -> usize {
        match self.0.line_col {
            pest::error::LineColLocation::Pos((_, col)) => col,
            pest::error::LineColLocation::Span((_, col), _) => col,
        }
    }
    #[allow(unused)]
    pub fn row(&self) -> usize {
        match self.0.line_col {
            pest::error::LineColLocation::Pos((row, _)) => row,
            pest::error::LineColLocation::Span((row, _), _) => row,
        }
    }
}

#[derive(Parser)]
#[grammar = "typescript.pest"]
struct TypescriptParser;

pub struct Typescript {
    only_first: bool,
    var: i32,
}

struct Ret {
    result: TokenStream,
    need_undef: bool,
}

impl Typescript {
    pub fn new() -> Self {
        Self::with_first(false)
    }
    pub fn with_first(only_first: bool) -> Self {
        Typescript { only_first, var: 0 }
    }
    pub fn verify(typescript: &str) -> Result<pest::iterators::Pairs<'_, Rule>, Error> {
        Ok(TypescriptParser::parse(Rule::typescript, typescript).map_err(TypescriptParseError)?)
    }

    pub fn parse(&mut self, obj: &TokenStream, typescript: &str) -> Result<TokenStream, Error> {
        let pair = TypescriptParser::parse(Rule::typescript, typescript)
            .map_err(TypescriptParseError)?
            .next() // skip SOI
            .unwrap();
        let mut content = vec![];
        let mut need_undef = true;
        for item in pair.into_inner() {
            match item.as_rule() {
                Rule::EOI => break,
                other => assert_eq!(other, Rule::expr),
            }
            content.push({
                let r = self.parse_expr(obj, item)?;
                need_undef = r.need_undef;
                r.result
            });
        }
        assert!(content.len() == 1);
        let newl = nl();

        // obj can't be null or undefined
        assert!(self.level() == 0);
        let guard = if need_undef {
            let eq = eq();
            quote!(if (#obj #eq undefined) return false;)
        } else {
            quote!()
        };

        Ok(quote!(
            {
                #guard
                #(#content)*
                #newl return true;
            }
        ))
    }
    fn parse_expr<'a>(&mut self, obj: &TokenStream, expr: Pair<'a, Rule>) -> Result<Ret, Error> {
        // expr = { union | "(" ~ expr ~ ")" }

        let mut content = vec![];
        let mut is_union = false;
        let mut size = 0;
        for u in expr.into_inner() {
            content.push(match u.as_rule() {
                Rule::union => {
                    is_union = true;
                    let (q, n) = self.parse_union(&obj, u)?;
                    size = n;
                    q
                }
                Rule::expr => self.parse_expr(&obj, u)?,

                _ => unreachable!(),
            })
        }
        assert!(content.len() == 1);

        let c = &content[0].result;
        let n = content[0].need_undef;

        let test = if is_union && size > 1 {
            quote!(if ( !( () => { #c } )() ) return false;)
        } else {
            quote!( #c )
        };
        Ok(Ret {
            result: test,
            need_undef: n,
        })
    }
    fn parse_item<'a>(&mut self, obj: &TokenStream, item: Pair<'a, Rule>) -> Result<Ret, Error> {
        let mut i = item.into_inner();
        // item = { singleton ~ array  }
        let (singleton, array) = (i.next().unwrap(), i.next().unwrap());

        let mut content = vec![];
        let n = array.as_str().len();
        let narr = n / 2;
        assert!(narr * 2 == n);
        let mut size = 0;
        let mut is_union = false;
        let val = &obj; // self.pushvar();
                        // singleton = { str | map | tuple | typ | "(" ~ union ~ ")" }
        for o in singleton.into_inner() {
            content.push(match o.as_rule() {
                Rule::map => self.parse_map(val, o)?,
                Rule::object => self.parse_struct(val, o)?,
                Rule::tuple => self.parse_tuple(val, o)?,
                Rule::base_type => self.parse_typ(val, o)?,
                Rule::union => {
                    is_union = true;
                    let (q, n) = self.parse_union(val, o)?;
                    size = n;
                    q
                }
                _ => unreachable!(),
            });
        }
        assert!(content.len() == 1);
        let c = &content[0].result;
        let n = content[0].need_undef;
        let test = if is_union && size > 1 {
            quote!(if ( !( () => { #c } )() ) return false;)
        } else {
            quote!( #c )
        };
        if narr == 0 {
            // self.popvar();
            Ok(Ret {
                result: test,
                need_undef: n,
            })
        } else {
            let brk = if self.only_first {
                quote!(break;)
            } else {
                quote!()
            };

            let mut vinner = self.pushvar();
            let mut inner = quote!(
                {
                    if (!Array.isArray(#vinner)) return false;
                    for (let #val of #vinner) {
                        #test
                        #brk
                    }
                }
            );
            for i in 0..narr - 1 {
                let vnext = self.pushvar();
                inner = quote!(
                if (!Array.isArray(#vnext)) return false;
                for (let #vinner of #vnext) {
                    #inner
                    #brk
                });
                vinner = vnext;
            }
            for i in 0..narr {
                self.popvar()
            }
            Ok(Ret {
                result: quote!(const #vinner = #obj; #inner;),
                need_undef: false,
            })
        }
    }
    fn parse_typ<'a>(&mut self, obj: &TokenStream, typ: Pair<'a, Rule>) -> Result<Ret, Error> {
        // typ = { "number" | "object" | "string" | "boolean" | "null" }
        let typ = typ.as_str();
        let eq = eq();
        Ok(Ret {
            result: quote!(
               if (!(typeof #obj #eq #typ)) return false;
            ),
            need_undef: false,
        })
    }
    fn parse_map<'a>(&mut self, obj: &TokenStream, map: Pair<'a, Rule>) -> Result<Ret, Error> {
        // map = {  "{" ~ "[" ~ "key" ~ ":" ~ key ~ "]" ~ ":" ~ expr ~ "}" }
        let mut i = map.into_inner();
        let (typ, expr) = (i.next().unwrap(), i.next().unwrap());
        let k = typ.as_str();

        // let typ = self.parse_typ(typ)?;
        let val = self.pushvar();
        let result = self.parse_expr(&val, expr)?;
        let eq = eq();
        let kval = self.pushvar();
        let k = if k == "number" {
            quote! {
                if (+#kval #eq NaN) return false;
            }
        } else {
            // always going to be a string
            quote!()
        };
        let brk = if self.only_first {
            quote!(break;)
        } else {
            quote!()
        };
        self.popvar();
        self.popvar();
        // obj is definitely not undefined... but it might be null...
        let v = result.result;
        Ok(Ret {
            result: quote!(
                if (!(typeof #obj #eq "object")) return false;
                for (let #kval in #obj) {
                    let #val = #obj[#kval];
                    // #val is not undefined....
                    #k;
                    #v;
                    #brk
                }
            ),
            need_undef: false,
        })
    }
    fn parse_union<'a>(
        &mut self,
        obj: &TokenStream,
        union: Pair<'a, Rule>,
    ) -> Result<(Ret, usize), Error> {
        // union = {   item ~ ("|" ~ item)*  }
        let mut results = vec![];
        // let val = self.pushvar();
        for item in union.into_inner() {
            match item.as_rule() {
                Rule::item => results.push(self.parse_item(obj, item)?),
                _ => unreachable!(),
            }
        }
        let newl = nl();
        let nl = (0..results.len()).map(|_| quote!(#newl));
        // self.popvar();
        // obj can't be null or undefined
        let n = results.len();
        // a *single* union doesn't need to check multiple failures
        // looking for a success....
        let content = results.iter().map(|r| &r.result);
        let need = results.iter().any(|r| r.need_undef);
        let ret = if n == 1 {
            quote!(
                #(#content)*
            )
        } else {
            quote!(
                {
                #( #nl if ( ( () => { #content; return true; } )() ) return true; )*
                #newl return false;
                }
            )
        };

        Ok((
            Ret {
                result: ret,
                need_undef: need,
            },
            n,
        ))
    }
    fn parse_tuple<'a>(&mut self, obj: &TokenStream, tuple: Pair<'a, Rule>) -> Result<Ret, Error> {
        // tuple = { "[" ~ expr ~ ("," ~ expr )+ ~ "]" }
        let mut content = vec![];
        let eq = eq();
        let val = self.pushvar();
        for (i, expr) in tuple.into_inner().enumerate() {
            let i = Literal::usize_unsuffixed(i);
            let n = quote!(#obj[#i]);

            match expr.as_rule() {
                Rule::expr => {
                    let v = self.parse_expr(&val, expr)?;
                    let verify = v.result;
                    let guard = if v.need_undef {
                        quote!(if (#n #eq undefined) return false;)
                    } else {
                        quote!()
                    };
                    content.push(quote! {
                        #guard
                        {
                            const #val = #n;
                            #verify;
                        }
                    });
                }
                _ => unreachable!(),
            }
        }
        self.popvar();
        let len = Literal::usize_unsuffixed(content.len());
        // isArray protects us from null obj
        Ok(Ret {
            result: quote!(
                if (!Array.isArray(#obj) || !(#obj.length #eq #len)) return false;
                #(#content)*
            ),
            need_undef: false,
        })
    }
    fn parse_struct<'a>(&mut self, obj: &TokenStream, pair: Pair<'a, Rule>) -> Result<Ret, Error> {
        // str = {  "{" ~ (ident ~ ":" ~ expr)? ~ ("," ~ ident ~ ":" ~ expr )* ~ "}" }
        let mut keys = vec![];
        let mut values = vec![];
        let val = self.pushvar();
        for expr in pair.into_inner() {
            match expr.as_rule() {
                Rule::ident => keys.push(ident_from_str(&expr.as_str())),
                Rule::expr => values.push(self.parse_expr(&val, expr)?),
                _ => unreachable!(),
            }
        }
        let mut ret = vec![];
        let eq = eq();
        for (n, v) in keys.iter().zip(values) {
            let verify = v.result;
            let guard = if v.need_undef {
                quote!(if (#obj.#n #eq undefined) return false;)
            } else {
                quote!()
            };
            ret.push(quote! {
                #guard
                {
                    const #val = #obj.#n;
                    #verify
                }
            });
        }
        self.popvar();
        // need to protect object access from the null object so ==

        Ok(Ret {
            result: quote!(if( !(typeof #obj #eq "object")) return false; #(#ret)*),
            need_undef: false,
        })
    }

    fn pushvar(&mut self) -> TokenStream {
        self.var += 1;

        let n = ident_from_str(&format!("val{}", self.var));
        quote!(#n)
    }
    fn popvar(&mut self) {
        self.var -= 1;
        assert!(self.var >= 0);
    }
    fn level(&self) -> i32 {
        self.var
    }
}

#[cfg(test)]
mod parser {
    use super::Typescript;
    use crate::patch::patch;
    use quote::quote;
    //#[test]
    fn typescript_parser() {
        let mut t = Typescript::new();
        match t.parse(&quote!(obj), &"[number, string]|{ [key: number]: string}[][] | {a: number} | (number|{a:{b:number}})") {
            Ok(q) => {eprintln!("{}", patch(&q.to_string()))},
            Err(msg) => assert!(false, msg)
        }
    }
    #[test]
    fn typescript_parser2() {
        let mut t = Typescript::new();
        match t.parse(&quote!(obj), &"[number, string][]") {
            Ok(q) => eprintln!("{}", patch(&q.to_string())),
            Err(msg) => assert!(false, msg),
        }
    }

}
