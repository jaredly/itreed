
use std::io::process::{Command, CreatePipe};
use std::collections::HashMap;

#[deriving(Clone)]
#[deriving(Decodable, Encodable)]
#[deriving(Show)]
struct Std {
    out: String,
    err: String,
    code: int,
}

pub fn env_cmd(file: &Path, env: &Option<HashMap<String, String>>) -> Command {
  let filename = file.as_str().unwrap();
  let mut c = Command::new(filename);
  c.stdout(CreatePipe(false, true));

  // env variables!
  match env {
    &Some(ref envmap) =>
      for (key, value) in envmap.iter() {
        c.env(key, value);
      },
    &None => ()
  };

  c
}

pub fn run(file: &Path, env: &Option<HashMap<String, String>>) -> Result<Std, Std> {
  // compile the file
  let filename = file.as_str().unwrap();
  let mut c = Command::new(filename);
  c.stdout(CreatePipe(false, true));

  // env variables!
  match env {
    &Some(ref envmap) =>
      for (key, value) in envmap.iter() {
        c.env(key, value);
      },
    &None => ()
  };

  let mut p = c.spawn().unwrap();
  let std = Std {
    out: (p.stdout.as_mut().unwrap() as &mut Reader).read_to_string().unwrap(),
    err: (p.stderr.as_mut().unwrap() as &mut Reader).read_to_string().unwrap(),
    code: 1,
  };

  match p.wait().unwrap().success() {
    true => Ok(std),
    false => Err(std),
  }
}

