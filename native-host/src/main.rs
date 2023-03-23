use std::io::{self, Write, BufReader, BufRead};
use std::process::{Command, Stdio};
use std::thread;

use websocket::OwnedMessage;
use websocket::sync::Server;

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

            loop {
                let message = client.recv_message().unwrap();

                let message_cp = message.clone();                
                match message {
                    OwnedMessage::Close(_) => break,
                    OwnedMessage::Text(text) => {
                        stdin.write_fmt(format_args!("Content-Length: {}\r\n\r\n", text.len())).unwrap();
                        stdin.write_all(text.as_bytes()).unwrap();
                        let _ = client.send_message(&message_cp);
                    },
                    _ => println!("Unexpected input: {:?}", message)
                }
            }

            child.kill().unwrap();
       });
    }


    Ok(())
}




    // let stdout = exec.stdout.take().unwrap();

    // stdin.write_all(b"Something cool\n")?;
    // let mut reader = BufReader::new(stdout);
    // let mut buf = String::new();
    // reader.read_line(&mut buf)?;

    // exec.kill()?;

    // println!("{}", buf);
