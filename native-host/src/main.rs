use std::collections::HashMap;
use std::error::Error;
use std::fs::OpenOptions;
use std::io::{self, Write};
use std::panic;
use std::process::Stdio;
use std::sync::Arc;
use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::str;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};
use tokio::process::Command;
use tokio::sync::Mutex;
use tokio::time;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::WebSocketStream;

use chrome_native_messaging::{read_input, send};

fn handle_panic(info: &std::panic::PanicInfo) {
    let msg = match info.payload().downcast_ref::<&'static str>() {
        Some(s) => *s,
        None => match info.payload().downcast_ref::<String>() {
            Some(s) => &s[..],
            None => "Box<Any>",
        },
    };
    // Ignore error if send fails, we don't want to panic inside the panic handler
    let _ = send!({
        "status": "panic",
        "payload": msg,
        "file": info.location().map(|l| l.file()),
        "line": info.location().map(|l| l.line())
    });
}

async fn setup_files(
    message: Value,
    files_cache: Arc<Mutex<HashMap<String, Option<String>>>>,
) -> Result<tempfile::TempDir, Box<dyn Error>> {
    let tempdir = tempfile::tempdir()?;

    let mut guard = files_cache.lock().await;
    if let Some(files) = message["files"].as_array() {
        for file in files {
            let rel_path = file["path"].as_str().unwrap_or("/tmp/cx-lsp-clang");
            let abs_path = tempdir
                .path()
                .join(rel_path.strip_prefix("/").unwrap_or(rel_path));

            if let Some(path) = abs_path.to_str() {
                guard.insert(path.to_owned(), None);
            }
            if let Some(parent) = abs_path.parent() {
                std::fs::create_dir_all(parent)?;
            };

            OpenOptions::new()
                .write(true)
                .create(true)
                .open(abs_path)?
                .write_all(file["content"].as_str().unwrap_or("").as_bytes())?;
        }
    };

    if let Some(path) = tempdir.path().to_str() {
        send!({ "directory": path })?;
    }

    Ok(tempdir)
}

async fn replace_uri(
    text: &mut String,
    files: &Arc<Mutex<HashMap<String, Option<String>>>>,
    temp: &String,
) -> Result<(), Box<dyn Error>> {
    let mut v: Value = serde_json::from_str(&text)?;

    // TODO root uri and all that nice DocumentURI stuff
    if let Some(uri) = v["params"]["textDocument"]["uri"].as_str() {
        if let Some(session) = uri.split(".").next() {
            for _ in 0..3 {
                if let Some((path, _session)) = files
                    .lock()
                    .await
                    .iter()
                    .find(|(_, value)| value == &&Some(session.to_owned()))
                {
                    // TODO does work with http://?
                    v["params"]["textDocument"]["uri"] = json!("file://".to_owned() + path);
                    *text = v.to_string();
                    break;
                }
                time::sleep(Duration::from_millis(100)).await;
            }
        }
    }
    if let Some(_) = v["params"]["rootUri"].as_str() {
        v["params"]["rootUri"] = json!(temp);
        *text = v.to_string();
    }

    Ok(())
}

async fn handle_client(
    client: WebSocketStream<TcpStream>,
    files: Arc<Mutex<HashMap<String, Option<String>>>>,
    temp: &String,
) -> Result<(), Box<dyn Error>> {
    let (mut ws_write, mut ws_read) = client.split();

    let mut clangd = Command::new("clangd")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()?;

    let stdin = clangd.stdin.as_mut().unwrap();
    let stdout = clangd.stdout.as_mut().unwrap();
    let mut buf_stdout = BufReader::new(stdout);
    let mut header: String;

    // TODO break loop
    loop {
        tokio::select! {
            msg = ws_read.next() => {
                match msg {
                    Some(msg) => {
                        let msg = msg?;
                        if msg.is_text() {
                            let mut text = msg.into_text()?;
                            replace_uri(&mut text, &files, temp).await?;

                            send!({ "lsp-sent": text })?;
                            stdin.write_all(&std::format!("Content-Length: {}\r\n\r\n", text.len()).as_bytes()).await?;
                            stdin.write_all(text.as_bytes()).await?;
                        } else if msg.is_close() {
                            break;
                        }
                    }
                    None => break,
                }
            },
            res = buf_stdout.read_line({ header = String::new(); &mut header }) => {
                res?;
                let length = header.split_whitespace().collect::<Vec<&str>>()[1].parse::<usize>()?;
                buf_stdout.read_line(&mut String::new()).await?;

                let mut buf = vec![0; length];
                buf_stdout.read_exact(&mut buf).await?;

                let msg = str::from_utf8(&buf)?;
                send!({ "lsp-received": msg })?;

                ws_write.send(Message::Text(msg.to_owned())).await?;
            }
        }
    }

    clangd.kill().await?;
    Ok(())
}

async fn run_server(
    files: Arc<Mutex<HashMap<String, Option<String>>>>,
    temp: String,
) -> Result<(), Box<dyn Error>> {
    let listener = TcpListener::bind("127.0.0.1:0").await?;
    let addr = listener.local_addr()?;

    send!({ "type": "cx-lsp-port", "port": addr.port() })?;
    send!({ "type": "log", "lsp-status": "started" })?;

    while let Ok((stream, _)) = listener.accept().await {
        send!({ "type": "log", "lsp-status": "connected" })?;

        let ws_stream = tokio_tungstenite::accept_async(stream).await?;
        // We only want to accept 1 connection, so await
        handle_client(ws_stream, files.clone(), &temp).await?;
    }

    send!({ "type": "log", "lsp-status": "stopped" })?;
    Ok(())
}

// TODO remove all unwraps
#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    panic::set_hook(Box::new(handle_panic));

    let result: Result<(), Box<dyn Error>> = (async {
        let files = Arc::new(Mutex::new(HashMap::new()));
        let mut temp = None;

        loop {
            let message = read_input(io::stdin())?;
            match message["type"].as_str() {
                Some("cx-lsp-init") => {
                    let tempdir = setup_files(message, files.clone()).await?;

                    let files = files.clone();
                    let temppath = tempdir.path().to_str().unwrap().to_owned(); // TODO unwrap
                    temp = Some(tempdir);
                    // TODO cleanup thread?
                    tokio::spawn(async move {
                        if let Err(err) = run_server(files, temppath).await {
                            send!({ "type": "error", "error": &std::format!("{:?}", err) })
                                .unwrap();
                        }
                    });
                }
                Some("cx-lsp-filename") => {
                    if let (Some(session), Some(filename), Some(path)) = (
                        message["session"].as_str(),
                        message["filename"].as_str(),
                        temp.as_ref().map(|t| t.path()),
                    ) {
                        if let Some(path) = path.to_str() {
                            let mut guard = files.lock().await;

                            guard.insert(path.to_owned() + &filename, Some(session.to_owned()));
                            send!({ "lsp-files": *guard })?;
                        }
                    }
                }
                Some("cx-lsp-stop") => break,
                Some(unknown) => {
                    send!({ "type": "error", "unkown_message": unknown })?;
                }
                None => (),
            }
        }

        Ok(())
    })
    .await;
    if let Err(err) = result {
        send!({ "error": &std::format!("{:?}", err) }).unwrap();
    }

    Ok(())
}
