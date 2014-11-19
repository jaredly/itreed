extern crate rustc;
extern crate syntax;
use rustc::driver::config::{basic_options, build_configuration};//, CrateTypeRlib, CrateTypeDylib};
use rustc::driver::session::{build_session, Session};
use rustc::driver::driver::{FileInput, StrInput, Input, compile_input};
use syntax::parse::new_parse_sess;
use rustc::back::write::OutputTypeExe;
use syntax::diagnostics;
// use std::mem;

// use std::dynamic_lib::DynamicLibrary;

/*
 * Build a basic session object to output a compiled binary.
 */
fn basic_sess(sysroot: Path) -> Session {
    let mut opts = basic_options();
    opts.output_types = vec![OutputTypeExe];
    opts.maybe_sysroot = Some(sysroot);
    // opts.crate_types = vec![CrateTypeDylib];

    let descriptions = diagnostics::registry::Registry::new(rustc::DIAGNOSTICS);
    let mut sess = build_session(opts, None, descriptions);
    sess.parse_sess = new_parse_sess();
    sess
}

fn compile_simple(input: Input, output: Path, sysroot: Option<Path>) {
    let sess = basic_sess(match sysroot {
        Some(path) => path,
        None => Path::new("/usr/local/")
    });
    let cfg = build_configuration(&sess);

    compile_input(sess,
            cfg,
            &input,
            &None,      // output directory (unused when there's an output file)
            &Some(output), // output file
            None);
}

/*
 * Compile a string to rust! Takes an input string of source code and an output
 * path to write to, and optionally a sysroot. If no sysroot is given, a default
 * of /usr/local/ is used.
 */
pub fn compile_string(input: String, output: Path, sysroot: Option<Path>) {
    compile_simple(StrInput(input), output, sysroot)
}

pub fn compile_file(input: Path, output: Path, sysroot: Option<Path>) {
    compile_simple(FileInput(input), output, sysroot)
}

fn main() {

    println!("Start");
    let src = "fn main() { println!(\"Awesome\"); }";
    let out = Path::new("/tmp/outed.rlib".to_string());

    compile_string(src.to_string(), out.clone(), None);

    println!("One");
    compile_file(Path::new("./awe.rs".to_string()), out.clone(), None);
    println!("Two");
    compile_file(Path::new("./awe.rs".to_string()), out.clone(), None);
    compile_file(Path::new("./awe.rs".to_string()), out.clone(), None);

    compile_string(
        src.to_string(), //"fn main(){println!(\"Other\");}".to_string(),
        Path::new("/tmp/other".to_string()),
        None);
    /*
    let lib = match DynamicLibrary::open(Some(&out)) {
        Err(err) => panic!("Could not load, {}", err),
        Ok(lib) => lib
    };
    let main2: extern fn() = unsafe {
        match lib.symbol("one") {
            Err(error) => panic!("Could not load function main: {}", error),
            Ok(main) => mem::transmute::<*mut u8, _>(main)
        }
    };

    main2();
    println!("Ran");
    */
    println!("Compiled")
}

