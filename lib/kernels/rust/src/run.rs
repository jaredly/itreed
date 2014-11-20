
use std::io::process::{Command, CreatePipe};

#[deriving(Clone)]
#[deriving(Decodable, Encodable)]
#[deriving(Show)]
struct Std {
    out: String,
    err: String,
}

pub fn run(file: &Path) -> Result<Std, Std> {
  // compile the file
  let mut p = Command::new(file.as_str().unwrap())
    // .stdin(CreatePipe(true, false))
    .stdout(CreatePipe(false, true))
    .spawn().unwrap();

  // p.stdin.as_mut().unwrap().write(contents.as_bytes()).unwrap();
  // drop(p.stdin.take());

  let std = Std {
    out: (p.stdout.as_mut().unwrap() as &mut Reader).read_to_string().unwrap(),
    err: (p.stderr.as_mut().unwrap() as &mut Reader).read_to_string().unwrap(),
  };

  match p.wait().unwrap().success() {
    true => Ok(std),
    false => Err(std),
  }
}

