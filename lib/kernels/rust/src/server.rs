
extern crate router;
extern crate iron;

use std::io::process::{Command, CreatePipe};

use std::io::net::ip::Ipv4Addr;
use iron::{status, Iron, Request, Response, IronResult, Handler, IronError};
use router::{Router};
use iron::response::modifiers::Status;


impl Handler for |&mut Request| -> IronResult<Response> {
    fn call(&self, req: &mut Request) -> IronResult<Response> {
        (*self)(req)
    }

    fn catch(&self, _: &mut Request, err: IronError) -> (Response, IronResult<()>) {
        (Response::new().set(Status(status::InternalServerError)), Err(err))
    }
}


fn main() {
    let mut router = Router::new();
    router.get("/", han);
    // router.get("/one", |req: &mur Request| -> 
    /*
    router.get("/", |req: &mut Request| -> IronResult<Response> {
        Ok(Response::with(status::Ok, "Hello!"))
    });
    */

    Iron::new(router).listen(Ipv4Addr(127, 0, 0, 1), 3000);

    fn han(req: &mut Request) -> IronResult<Response> {
        Ok(Response::with(status::Ok, "Hello!"))
    }
}

