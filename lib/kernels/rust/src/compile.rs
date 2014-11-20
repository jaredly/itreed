
use std::io::process::{Command, CreatePipe};

pub fn compile_subprocess(contents: String, out: &Path) -> Result<String, String> {
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
    false => Err(err),
  }
}
