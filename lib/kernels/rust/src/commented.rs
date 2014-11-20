/*
// CONFLICT
impl<'a, T: Encodable<Encoder<'a>, std::io::IoError>> JsonBody<String> for T {
    fn to_body(&self) -> Body<String> {
        Body(json::encode(&self))
    }
}
*/

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

/*
trait CanBody {
    fn do_body(self, &mut Response);
}
trait Awe {
    fn set_body(self, &mut Response);
}
impl Decodable<Decoder, DecoderError> for DoneCompiled {}
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

