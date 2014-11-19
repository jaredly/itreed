
use std::io::process::{Command, CreatePipe};

fn run_subprocess(contents: &str, out: &Path) -> Result(str) {

  // compile the file
  let mut p = Command::new("/usr/local/bin/rustc")
    .env("LD_LIBRARY_PATH", "/usr/local/lib")
    .arg("-o").arg(out.as_str().unwrap())
    .arg("-O")
    .arg("-")
    .stdin(CreatePipe(true, false))
    .stdout(CreatePipe(false, true))
    .spawn().unwrap();

  p.stdin.as_mut().unwrap().write(contents.as_bytes()).unwrap();
  drop(p.stdin.take());

  let out = (p.stdout.as_mut().unwrap() as &mut Reader).read_to_string().unwrap();
  let err = (p.stderr.as_mut().unwrap() as &mut Reader).read_to_string().unwrap();
  match p.wait().unwrap().success() {
    true => Ok(out),
    false => Error(err),
  }
}
