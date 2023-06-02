use std::io::{self, Write, BufReader, BufRead, Read};
use std::process::{Command, Stdio};
use std::thread;

use serde_json::{Value, json};
use websocket::{OwnedMessage, Message};
use websocket::sync::Server;
use std::str;

fn main() -> io::Result<()> {
    let server = Server::bind("127.0.0.1:8080").unwrap();

    for connection in server.filter_map(Result::ok) {
        thread::spawn(move || {
            let mut client = connection.accept().unwrap();
    
            let mut child = Command::new("clangd")
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .spawn().unwrap();

            let stdin = child.stdin.as_mut().unwrap();
            let stdout = child.stdout.as_mut().unwrap();
            let mut buf_stdout = BufReader::new(stdout);

            loop {
                let message = client.recv_message().unwrap();

                match message {
                    OwnedMessage::Close(_) => break,
                    OwnedMessage::Text(mut text) => {
                        let mut v : Value = serde_json::from_str(&text).unwrap();
                        
                        if v["method"].is_string() && v["method"].as_str().unwrap() == "textDocument/didOpen" {
                            let uri = v["params"]["textDocument"]["uri"].as_str().unwrap();
                            println!("{}", uri);
                            v["params"]["textDocument"]["uri"] = json!("file:///".to_owned() + uri);
                            text = v.to_string();
                        }

                        println!("--->\r\n{}", text.as_str());
                        stdin.write_fmt(format_args!("Content-Length: {}\r\n\r\n", text.len())).unwrap();
                        stdin.write_all(text.as_bytes()).unwrap();

                        let mut header = String::new();
                        buf_stdout.read_line(&mut header).unwrap();
                        let length : usize = header.split_whitespace().collect::<Vec<&str>>()[1].parse().unwrap();
                        buf_stdout.read_line(&mut header).unwrap();
                        
                        let mut buf = vec![0; length];
                        buf_stdout.read_exact(&mut buf).unwrap();

                        let msg = str::from_utf8(&buf).unwrap();
                        println!("<---\r\n{}", msg);
                        client.send_message(&Message::text(msg)).unwrap();
                    },
                    _ => println!("Unexpected input: {:?}", message)
                }
            }

            child.kill().unwrap();
       });
    }


    Ok(())
}
