#[allow(unused_imports)]
use super::Typescriptify;

#[cfg(test)]
mod macro_test {
    // use proc_macro2::Ident;
    use super::Typescriptify;
    use insta::assert_snapshot_matches;
    use quote::quote;
    #[test]
    fn tag_clash_in_enum() {
        let tokens = quote!(
            #[derive(Serialize)]
            #[serde(tag = "kind")]
            enum A {
                Unit,
                B { kind: i32, b: String },
            }
        );

        let result = std::panic::catch_unwind(move || Typescriptify::parse(true, tokens));
        match result {
            Ok(_x) => assert!(false, "expecting panic!"),
            Err(ref msg) => assert_snapshot_matches!( msg.downcast_ref::<String>().unwrap(),
            @r###"2 errors:
	# variant field name `kind` conflicts with internal tag
	# clash with field in "A::B". Maybe use a #[serde(content="...")] attribute."###
            ),
        }
    }
    #[test]
    fn flatten_is_fail() {
        let tokens = quote!(
            #[derive(Serialize)]
            struct SSS {
                a: i32,
                b: f64,
                #[serde(flatten)]
                c: DDD,
            }
        );
        let result = std::panic::catch_unwind(move || Typescriptify::parse(true, tokens));
        match result {
            Ok(_x) => assert!(false, "expecting panic!"),
            Err(ref msg) => assert_snapshot_matches!( msg.downcast_ref::<String>().unwrap(),
            @"SSS: #[serde(flatten)] does not work for typescript-definitions."
            ),
        }
    }

    #[test]
    fn verify_is_recognized() {
        let tokens = quote!(
            #[derive(Serialize)]
            #[ts(guard = "blah")]
            struct S {
                a: i32,
                b: f64,
            }
        );
        let result = std::panic::catch_unwind(move || Typescriptify::parse(true, tokens));
        match result {
            Ok(_x) => assert!(false, "expecting panic!"),
            Err(ref msg) => assert_snapshot_matches!( msg.downcast_ref::<String>().unwrap(),
            @r###"S: guard must be true or false not ""blah"""###
            ),
        }
    }
    /*
    #[test]
    fn turbofish() {
        let tokens = quote!(
            #[derive(TypeScriptify)]
            #[ts(turbofish = "<i32>")]
            struct S<T> {
                a: i32,
                b: Vec<T>,
            }
        );
        let ty = Typescriptify::parse(true, tokens);
        let i = &ty.ctxt.ident;
        let g = ty.ctxt.global_attrs.turbofish.unwrap_or_else(|| quote!());
        let res = quote!(#i#g::type_script_ify()).to_string();
        assert_snapshot_matches!(res,
        @"S < i32 > :: type_script_ify ( )" );
    }
    */
    #[test]
    fn bad_ts_as() {
        let tokens = quote!(
            #[derive(TypeScriptify)]

            struct S<T> {
                #[ts(ts_as = "😀i32>")]
                a: i32,
                #[ts(ts_as = "T[]")]
                b: Vec<T>,
            }
        );
        let result = std::panic::catch_unwind(move || Typescriptify::parse(false, tokens));
        match result {
            Ok(_x) => assert!(false, "expecting panic!"),
            Err(ref msg) => assert_snapshot_matches!( msg.downcast_ref::<String>().unwrap(),
            @r###"2 errors:
	# ts_as: "😀i32>" is not a valid rust type
	# ts_as: "T[]" is not a valid rust type"###
            ),
        }
    }
}
