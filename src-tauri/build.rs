use std::env;
use std::fs::File;
use std::io::Write;
use std::path::Path;

fn main() {
    let out_dir = env::var("OUT_DIR").unwrap();
    let dest_path = Path::new(&out_dir).join("cargo_env.rs");
    let mut f = File::create(&dest_path).unwrap();

    let mut map = String::from("const CARGO_ENV: &[(&str, &str)] = &[\n");
    for (key, value) in env::vars() {
        if key.starts_with("CARGO_") {
            map.push_str(&format!("    (\"{}\", \"{}\"),\n", key, value));
        }
    }
    map.push_str("];\n");

    f.write_all(map.as_bytes()).unwrap();
    
    tauri_build::build();
}
