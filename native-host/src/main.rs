use std::{error::Error, panic, path::Path, sync::Arc};

use serde_json::{json, Value};
use std::str;
use tokio::{
    io::{AsyncBufReadExt, AsyncRead, AsyncReadExt, AsyncWriteExt, BufReader},
    process::{ChildStdin, Command},
    sync::Mutex,
};

type DynError = Box<dyn Error + Send + Sync>;

use chrome_native_messaging::send;

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
        "type": "panic",
        "data": msg,
        "file": info.location().map(|l| l.file()),
        "line": info.location().map(|l| l.line())
    });
}

async fn read_lsp_message<R: AsyncBufReadExt + std::marker::Unpin>(
    buf: &mut R,
) -> Result<String, DynError> {
    let mut header = String::new();
    buf.read_line(&mut header).await?;
    // Command::new("notify-send").args([std::format!("{:?}", header)]).spawn()?;

    let length = header.split_whitespace().collect::<Vec<&str>>()[1].parse::<usize>()?;
    buf.read_line(&mut String::new()).await?;

    // Command::new("notify-send").args([std::format!("{:?}", length)]).spawn()?;

    let mut msg = vec![0; length];
    buf.read_exact(&mut msg).await?;
    // Command::new("notify-send").args([std::format!("{:?}", msg)]).spawn()?;
    Ok(str::from_utf8(&msg)?.to_string())
}

async fn handle_lsp_message(message: String) -> Result<(), Box<dyn Error + Send + Sync>> {
    send!({ "type": "response", "data": message })?;
    Ok(())
}

async fn read_browser_message<R: AsyncRead + std::marker::Unpin>(
    mut input: R,
) -> Result<Value, DynError> {
    let mut buf = [0; 4];
    input.read_exact(&mut buf).await?;
    // send!({ "type": "info", "data": std::format!("{:?}", buf), "data2": u32::from_ne_bytes(buf) })?;

    let mut buffer = vec![0; u32::from_ne_bytes(buf) as usize];
    input.read_exact(&mut buffer).await?;

    // send!({ "type": "info", "data": str::from_utf8(&buffer)? })?;
    // send!({ "type": "info", "data": serde_json::from_slice::<Value>(&buffer)?["message"].as_str() })?;
    // send!({ "type": "info", "data": str::from_utf8(&buffer)? })?;
    Ok(serde_json::from_slice(&buffer)?)
}

async fn handle_browser_message(
    message: &Value,
    clangd: &mut ChildStdin,
    dir: &Path,
) -> Result<bool, DynError> {
    // Command::new("notify-send").args([std::format!("{:?}", message)]).spawn()?;
    // Command::new("notify-send").args([std::format!("{:?}", message["type"].as_str())]).spawn()?;
    // send!({ "type": "info", "data": std::format!("{:?}", message) })?;
    match message["type"].as_str() {
        Some("file") => {
            if let Some(rel_path) = message["path"].as_str() {
                let path = dir.join(rel_path.strip_prefix("/").unwrap_or(rel_path));
                if !path.starts_with(dir) {
                    send!({
                        "type": "warning",
                        "data": "tried to access file outside temp directory".to_owned() + path.to_str().unwrap_or("")
                    })?;
                }

                if let Some(content) = message["content"].as_str() {
                    if let Some(parent) = path.parent() {
                        std::fs::create_dir_all(parent)?;
                    }

                    std::fs::write(path, content)?;
                } else {
                    if path.try_exists()? {
                        std::fs::remove_file(path)?;
                    }
                }
            }
        }
        Some("request") => {
            if let Some(msg) = message["message"].as_str() {
                // Command::new("notify-send").args([msg]).spawn()?;
                clangd
                    .write_all(
                        &std::format!("Content-Length: {}\r\n\r\n{}", msg.len(), msg).as_bytes(),
                    )
                    .await?;
            } else {
                send!({ "type": "warning", "data": "lsp message has no 'message' field" })?;
            }
        }
        Some("stop") => return Ok(false),
        Some(unknown) => {
            send!({ "type": "warning", "data": "unknown message type: ".to_owned() + unknown })?
        }
        None => send!({ "type": "warning", "data": "message sent without type" })?,
    }
    Ok(true)
}

#[tokio::main]
async fn main() {
    panic::set_hook(Box::new(handle_panic));

    let result: Result<(), DynError> = (async {
        read_browser_message(tokio::io::stdin()).await?;

        let temp = Arc::new(tempfile::tempdir()?);

        let clangd = Arc::new(Mutex::new(Command::new("clangd")
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            // .stderr(std::fs::File::create(temp.path().to_str().unwrap().to_owned() + "/stderr").unwrap())
            .spawn()?));

        let mut owned_stdin = clangd
            .lock().await
            .stdin.take();
        let mut owned_stdout = clangd
            .lock().await
            .stdout.take();

        send!({ "type": "directory", "data": temp.path().to_str().ok_or("Temp directory has no path")? })?;
        let lsp_handler = tokio::spawn(async move {
            let mut stdout = BufReader::new(
                owned_stdout
                    .as_mut()
                    .ok_or("Can't attach to clangd Stdout")?
            );
            loop {
                let message = read_lsp_message(&mut stdout).await?;
                let ret = handle_lsp_message(message).await;
                if ret.is_err() {
                    return ret;
                }
            }
        });

        let browser_handler = tokio::spawn(async move {
            let stdin = owned_stdin.as_mut().ok_or("Can't attach to clangd Stdin")?;

            let tempdir = temp.path();
            loop {
                let message = read_browser_message(tokio::io::stdin()).await?;
                if !handle_browser_message(&message, stdin, tempdir).await? {
                    return Ok::<(), DynError>(());
                }
            }
        });

        tokio::select! {
            ret = lsp_handler => ret,
            ret = browser_handler => ret,
        }??;

        Ok(())
    })
    .await;
    if let Err(err) = result {
        send!({ "type": "error", "data": &std::format!("{:?}", err) }).unwrap();
    }
}
