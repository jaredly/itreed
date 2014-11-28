
extern crate iron;
extern crate router;
extern crate bodyparser;
extern crate serialize;

use std::rand;
use std::io::{fs, MemReader, IoResult, IoError};
use std::io::net::ip::Ipv4Addr;
use std::collections::HashMap;
use std::io::process::{Command, CreatePipe};

use iron::{status, Set, Iron, Request, Response, IronResult, Plugin};
use iron::response::modifiers::{Body, Bodyable, ContentType};
use iron::modifier::Modifier;
use iron::headers::content_type::MediaType;

// middlewares
use router::Router;
use bodyparser::BodyParser;
use iron::response::modifiers::Status;

use serialize::{json, Encodable};
use serialize::json::{Encoder};

mod compile;
mod run;

trait JsonBody<T: Bodyable> {
    fn to_body(self) -> Body<T>;
}

impl<T: Bodyable> JsonBody<T> for T {
    fn to_body(self) -> Body<T> {
        Body(self)
    }
}

fn show_json<'a, T: Encodable<Encoder<'a>, std::io::IoError>>(stat: status::Status, body: T) -> IronResult<Response>{
    Ok(Response::new()
        .set(Status(stat))
        .set(any_cors())
        .set(Body(json::encode(&body)))
        .set(ContentType(MediaType::new("text".to_string(), "json".to_string(), vec![]))))
}

fn res<T: Bodyable>(stat: status::Status, body: T) -> IronResult<Response> {
    Ok(Response::new()
        .set(Status(stat))
        .set(any_cors())
        .set(Body(body)))
}

fn ok<T: Bodyable>(body: T) -> IronResult<Response> {
    Ok(Response::new()
        .set(Status(status::Ok))
        .set(any_cors())
        .set(Body(body)))
}

#[deriving(Clone)]
#[deriving(Decodable)]
#[deriving(Show)]
struct PleaseCompile {
    code: String,
    env: Option<HashMap<String, String>>,
}

#[deriving(Clone)]
#[deriving(Decodable, Encodable)]
#[deriving(Show)]
struct CompileResult {
    stdout: String,
    stderr: String,
    status: int,
    signal: int,
}

impl CompileResult {
    fn new(res: std::io::process::ProcessOutput) -> CompileResult {
        let mut m = CompileResult{
            stdout: String::from_utf8(res.output).unwrap(),
            stderr: String::from_utf8(res.error).unwrap(),
            status: 0,
            signal: 0,
        };
        match res.status {
            std::io::process::ExitStatus(x) => m.status = x,
            std::io::process::ExitSignal(x) => m.signal = x,
        };
        m
    }
}

#[deriving(Clone)]
#[deriving(Decodable, Encodable)]
#[deriving(Show)]
struct CompileFailed {
    error: String,
}

fn any_cors() -> Cors {
    Cors("*".to_string())
}

struct Cors(pub String);

impl Modifier<Response> for Cors {
    fn modify(self, res: &mut Response) {
        let Cors(origin) = self;
        res.headers.access_control_allow_origin = Some(origin);
    }
}

fn rand_name(length: uint) -> String {
    String::from_chars(range(0u, length).map(|_| rand::random::<char>()).collect::<Vec<_>>().as_slice())
}

struct CmdReader {
    cmd: Command,
    reader: Option<std::io::MemReader>,
}

impl CmdReader {
    fn init_reader(&mut self) {
        let data = match self.cmd.spawn().unwrap().wait_with_output() {
            Ok(result) => json::encode(&CompileResult::new(result)),
            _ => "Failed to do awesome".to_string(),
        };
        let reader = MemReader::new(data.into_bytes());
        self.reader = Some(reader);
    }
}

impl Reader for CmdReader {
    fn read(&mut self, buf: &mut [u8]) -> IoResult<uint> {
        match self.reader {
            None => self.init_reader(),
            Some(_) => (),
        };
        match self.reader {
            Some(ref mut reader) => reader.read(buf),
            None => panic!("Unable to initialize reader"),
        }
    }
}

impl Modifier<Response> for CmdReader {
    fn modify(self, res: &mut Response) {
        res.body = Some(box self as Box<Reader+Send>);
    }
}

// struct CompileReader

fn compileit(req: &mut Request) -> IronResult<Response> {

    let body = match req.get::<BodyParser<PleaseCompile>>() {
        Some(body) => body,
        None => return res(status::BadRequest, "Invalid request format"),
    };

    let mut out = Path::new("/tmp/basic");
    out.set_filename(rand_name(20));
    match compile::compile_subprocess(body.code, &out) {
        Ok(_) => (),
        Err(err) => return show_json(status::NotAcceptable, CompileFailed {
            error: err
        }),
    };

    let c = CmdReader {
        cmd: run::env_cmd(&out, &body.env),
        reader: None,
    };

    Ok(Response::new()
        .set(Status(status::Ok))
        .set(any_cors())
        .set(c)
        .set(ContentType(MediaType::new("text".to_string(), "json".to_string(), vec![]))))

        /*
    let res = match run::run(&out, &body.env) {
        Ok(std) => show_json(status::Ok, std),
        Err(std) => show_json(status::ExpectationFailed, std),
    };
    fs::unlink(&out).unwrap();
    res
    */
}

fn corsme(req: &mut Request) -> IronResult<Response> {
    Ok(Response::new()
        .set(Status(status::Ok))
        .set(any_cors())
        .set(Body("Ok")))
}

fn hello(_: &mut Request) -> IronResult<Response> {
    Ok(Response::new()
        .set(Status(status::Ok))
        .set(any_cors())
        .set(Body("{\"status\": \"running\", \"version\": \"0.1.0\", \"lang\": \"rust\"}"))
        .set(ContentType(MediaType::new("text".to_string(), "json".to_string(), vec![]))))
}

fn setup_routes(router: &mut Router) {
    router.get("/", hello);
    router.post("/", compileit);
    router.options("/", corsme);
}

fn main() {
    let mut router = Router::new();
    setup_routes(&mut router);
    Iron::new(router).listen(Ipv4Addr(127, 0, 0, 1), 3000);
}

