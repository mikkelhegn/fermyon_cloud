wit_bindgen::generate!({ path: "wit", world: "provider" });

struct Formatter;

impl exports::lab::greeting::formatter::Guest for Formatter {
    fn greet(language: String) -> String {
        format!("Hello, {language}, from a composed component")
    }
}

export!(Formatter);
