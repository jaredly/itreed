
use std::io::process::{Command, CreatePipe};
use std::collections::HashMap;

#[deriving(Clone)]
#[deriving(Decodable, Encodable)]
#[deriving(Show)]
struct Std {
    out: String,
    err: String,
}

pub fn run(file: &Path, env: &Option<HashMap<String, String>>) -> Result<Std, Std> {
  // compile the file
  let filename = file.as_str().unwrap();
  let mut c = Command::new(filename);
  c.stdout(CreatePipe(false, true));
  match env {
    &Some(ref envmap) =>
      for (key, value) in envmap.iter() {
        c.env(key, value);
      },
    &None => ()
  };
  let mut p = c.spawn().unwrap();

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

