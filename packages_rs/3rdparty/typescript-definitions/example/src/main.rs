

#[allow(unused)]
use serde_json::Error;
mod interface;

#[cfg(any(debug_assertions, feature = "export-typescript"))]
fn main() -> Result<(), Error> {
    use serde_json;
    use self::interface::*;
    // need the trait
    use typescript_definitions::TypeScriptifyTrait;

    let point = Point {
        x: 23,
        y: 24,
        z: 33,
    };

    let f1 = FrontendMessage::Render {
        html: "stuff".into(),
        time: 33,
        other_result: Err(32),
    };
    let f2 = FrontendMessage::ButtonState {
        selected: vec!["a".into(), "b".into()],
        time: 33,
        other: None,
    };

    let b = MyBytes {
        buffer: vec![5u8, 6, 7, 8, 9, 186, 233],
    };
    let nt = Newtype(32);

    println!("Using Typescriptify.....");
    
    println!("{}", serde_json::to_string(&point)?);
    println!("{}", serde_json::to_string(&f1)?);
    println!("{}", serde_json::to_string(&f2)?);
    println!("{}", serde_json::to_string(&b)?);
    println!("{}", serde_json::to_string(&nt)?);

    println!("{}", Point::type_script_ify());
    println!("{}", Newtype::type_script_ify());
    println!("{}", Enum::type_script_ify());
    println!("{}", FrontendMessage::type_script_ify());
    println!("{}", Value::<i32>::type_script_ify());
    println!("{}", MyBytes::type_script_ify());
    println!("{}", MyBytes::type_script_guard().unwrap());

    Ok(())
}

#[cfg(not(any(debug_assertions, feature = "export-typescript")))]
fn main() {}
