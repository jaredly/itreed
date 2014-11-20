
extern crate iron;
extern crate router;
extern crate bodyparser;
extern crate serialize;

use std::io::net::ip::Ipv4Addr;

use iron::{status, Set, Iron, Request, Response, IronResult, Plugin};
use iron::response::modifiers::{Body, Bodyable};

// middlewares
use router::Router;
use bodyparser::BodyParser;
use iron::response::modifiers::Status;

use serialize::{Decodable, json, Encodable};
use serialize::json::{Decoder, DecoderError, Encoder};
use std::io::MemReader;

/*
use iron::{Handler, IronError};
type Closed = |&mut Request|:Send+Sync -> IronResult<Response>;

impl Handler for Closed {
    fn call(&self, req: &mut Request) -> IronResult<Response> {
        (*self)(req)
    }

    fn catch(&self, _: &mut Request, err: IronError) -> (Response, IronResult<()>) {
        (Response::new().set(Status(status::InternalServerError)), Err(err))
    }
}
*/

fn string_response(stat: status::Status, text: &str) -> IronResult<Response> {
    Ok(Response::new().set(Status(stat)).set(Body(text)))
}

trait JsonBody<T: Bodyable> {
    fn to_body(self) -> Body<T>;
}

impl<T: Bodyable> JsonBody<T> for T {
    fn to_body(self) -> Body<T> {
        Body(self)
    }
}

// CONFLICT
impl<'a, T: Encodable<Encoder<'a>, std::io::IoError>> JsonBody<String> for T {
    fn to_body(&self) -> Body<String> {
        Body(json::encode(&self))
    }
}

fn ok<T: Bodyable>(body: T) -> IronResult<Response> {
    Ok(Response::new().set(Status(status::Ok)).set(Body(body)))
}

#[deriving(Clone)]
#[deriving(Decodable)]
#[deriving(Show)]
struct PleaseCompile {
    code: String,
}

#[deriving(Clone)]
#[deriving(Decodable, Encodable)]
#[deriving(Show)]
struct DoneCompiled {
    compileError: String,
    stdout: String,
    stderr: String,
}

// impl Decodable<Decoder, DecoderError> for DoneCompiled {}

trait CanBody {
    fn do_body(self, &mut Response);
}

trait Awe {
    fn set_body(self, &mut Response);
}

/*
impl<'a> Awe for CanBody + 'a {
    fn set_body(self, res: &mut Response) {
        self.do_body(self, res)
    }
}

impl<'a, T: Encodable<Encoder<'a>, std::io::IoError>> Bodyable for T {
    fn set_body(self, res: &mut Response) {
        let s = json::encode(&self);
        let m = MemReader::new(s.into_bytes());
        res.body = Some(box m as Box<Reader+Send>)
    }
}
*/

fn han(_: &mut Request) -> IronResult<Response> {
    ok("Hello")
}

fn compileit(req: &mut Request) -> IronResult<Response> {
    match req.get::<BodyParser<PleaseCompile>>() {
        Some(parsed) => println!("Parsed Json:\n{}", parsed),
        None => println!("could not parse"),
    };
    let res = DoneCompiled{compileError: "None".to_string(), stdout: "Some".to_string(), stderr: "More".to_string()};
    ok(json::encode(&res))
}

fn setup_routes(router: &mut Router) {
    router.get("/", han);
    router.post("/", compileit);
}

fn main() {
    let mut router = Router::new();
    setup_routes(&mut router);

    Iron::new(router).listen(Ipv4Addr(127, 0, 0, 1), 3000);
}

