extern crate rustc;
extern crate rustc_trans;
extern crate syntax;
use rustc_trans::session::config::{basic_options, build_configuration};//, CrateTypeRlib, CrateTypeDylib};
use rustc_trans::session::{build_session, Session};
use rustc_trans::driver::driver::{FileInput, StrInput, Input, compile_input};
use rustc_trans::session::config::OutputTypeExe;
use syntax::diagnostics;

/*
 * Build a basic session object to output a compiled binary.
 */
fn basic_sess(sysroot: Path) -> Session {
    let mut opts = basic_options();
    opts.output_types = vec![OutputTypeExe];
    opts.maybe_sysroot = Some(sysroot);

    let descriptions = diagnostics::registry::Registry::new(&rustc::DIAGNOSTICS);
    let sess = build_session(opts, None, descriptions);
    sess
}

fn compile_simple(input: &Input, output: Path, sysroot: Option<Path>) {
    let sess = basic_sess(match sysroot {
        Some(path) => path,
        None => Path::new("/usr/local/")
    });
    let cfg = build_configuration(&sess);

    compile_input(sess,
            cfg,
            input,
            &None,      // output directory (unused when there's an output file)
            &Some(output), // output file
            None);
}

/*
 * Compile a string to rust! Takes an input string of source code and an output
 * path to write to, and optionally a sysroot. If no sysroot is given, a default
 * of /usr/local/ is used.
pub fn compile_string(input: String, output: Path, sysroot: Option<Path>) {
    compile_simple(&StrInput(input), output, sysroot)
}

pub fn compile_file(input: Path, output: Path, sysroot: Option<Path>) {
    compile_simple(&FileInput(input), output, sysroot)
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
    println!("Compiled")
}
 */


trait Compileable {
    fn to_input(self) -> Input;
}

impl Compileable for String {
    fn to_input(self) -> Input {
        StrInput(self)
    }
}

impl Compileable for Path {
    fn to_input(self) -> Input {
        FileInput(self)
    }
}

fn compile<T: Compileable>(input: T, output: Path, sysroot: Option<Path>) {
    compile_simple(&input.to_input(), output, sysroot)
}

fn main() {
    println!("Start");
    let src = "fn main() { println!(\"Awesome\"); }".to_string();
    let out = Path::new("/tmp/outed.rlib".to_string());

    compile(src, out.clone(), None);

    println!("One");

    compile(Path::new("./awe.rs".to_string()), out.clone(), None);
    println!("Two");
    compile(Path::new("./awe.rs".to_string()), out.clone(), None);
    compile(Path::new("./awe.rs".to_string()), out.clone(), None);

    println!("Compiled")
}

