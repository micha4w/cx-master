use core::time::Duration;
use std::{io::ErrorKind, panic, path::Path, sync::Arc};

use anyhow::anyhow;
use serde_json::{json, Value};
use std::str;
use tokio::{
    io::{AsyncBufReadExt, AsyncRead, AsyncReadExt, AsyncWriteExt, BufReader},
    process::{ChildStdin, Command},
    sync::Mutex, time,
};

use chrome_native_messaging::send;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
struct LSP {
    id: Option<String>,
    name: String,
    mode: String,
    command: String,
    args: Option<Vec<String>>,
}

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
) -> anyhow::Result<String> {
    let mut length = None;
    loop {
        let mut header = String::new();
        buf.read_line(&mut header).await?;
        // Command::new("notify-send").args([std::format!("{:?}", header)]).spawn()?;

        if header == "\r\n" {
            break;
        }

        let header_parts = header.split(": ").collect::<Vec<&str>>();
        // send!({ "type": "log", "header": header_parts })?;
        if header_parts.len() != 2 {
            return Err(anyhow!("Header sent by LSP is invalid"));
        }

        if header_parts[0] == "Content-Length" {
            length = Some(header_parts[1].trim().parse::<usize>()?);
        }
    }

    match length {
        Some(len) => {
            let mut msg = vec![0; len];
            buf.read_exact(&mut msg).await?;
            // Command::new("notify-send").args([std::format!("{:?}", msg)]).spawn()?;
            Ok(str::from_utf8(&msg)?.to_string())
        }
        None => Err(anyhow!("LSPs Headers didn't include Content-Length")),
    }
}

async fn handle_lsp_message(message: String) -> anyhow::Result<()> {
    send!({ "type": "response", "data": message })?;
    Ok(())
}

async fn read_browser_message<R: AsyncRead + std::marker::Unpin>(
    mut input: R,
) -> anyhow::Result<Value> {
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
) -> anyhow::Result<bool> {
    // Command::new("notify-send").args([std::format!("{:?}", message)]).spawn()?;
    // Command::new("notify-send").args([std::format!("{:?}", message["type"].as_str())]).spawn()?;
    // send!({ "type": "info", "data": std::format!("{:?}", message) })?;
    match message["type"].as_str() {
        Some("file") => {
            if let Some(rel_path) = message["path"].as_str() {
                let path = dir.join(rel_path.strip_prefix("/").unwrap_or(rel_path));
                if !path.starts_with(dir) {
                    send!({
                        "type": "error",
                        "data": "tried to access file outside temp directory".to_owned() + path.to_str().unwrap_or("")
                    })?;
                    return Ok(true);
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

async fn run_lsp(entry: &String) -> anyhow::Result<()> {
    let path = "lsps/".to_owned() + entry + ".json";
    let config_path = std::path::Path::new(&path);

    let config_str = std::fs::read_to_string(config_path)
        .map_err(|e| anyhow!("Failed to read lsp config file {}: {}", config_path.display(), e.to_string()))?;
    let config = serde_json::from_str::<LSP>(&config_str)?;

    // send!({ "type": "log", "data": "Read config file" })?;
    let temp = Arc::new(tempfile::tempdir()?);
    // send!({ "type": "log", "data": "Created temp dir" })?;

    let lsp = Arc::new(Mutex::new(Command::new(&config.command)
            .args(config.args.unwrap_or(Vec::new()))
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            // .stderr(
            //     std::fs::File::create("/home/micha4w/Code/JS/cx-master/native-host/stderr")
            //         .unwrap(),
            // )
            .current_dir(temp.path())
            .spawn()
            .map_err(|e| anyhow!("Failed to start '{}' process: {}", &config.command, e.to_string()))?
    ));
    // send!({ "type": "log", "data": "Created Command" })?;

    let mut owned_stdin = lsp.lock().await.stdin.take();
    let mut owned_stdout = lsp.lock().await.stdout.take();

    send!({ "type": "directory", "data": temp.path().to_str().ok_or(anyhow!("Temp directory has no path"))? })?;
    let lsp_handler = tokio::spawn(async move {
        let mut stdout = BufReader::new(
            owned_stdout
                .as_mut()
                .ok_or(anyhow!("Can't attach to LSPs Stdout"))?,
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
        let stdin = owned_stdin
            .as_mut()
            .ok_or(anyhow!("Can't attach to LSPs Stdin"))?;

        let tempdir = temp.path();
        loop {
            let message = read_browser_message(tokio::io::stdin()).await?;
            if !handle_browser_message(&message, stdin, tempdir).await? {
                return anyhow::Ok(());
            }
        }
    });

    tokio::select! {
        ret = lsp_handler => ret,
        ret = browser_handler => ret,
    }??;

    Ok(())
}

fn list_lsps() -> anyhow::Result<()> {
    let files = std::path::Path::new("lsps")
        .read_dir()?
        .map(|file_res| {
            file_res.and_then(|file: std::fs::DirEntry| -> std::io::Result<_> {
                let id = file
                    .path()
                    .file_stem()
                    .map(|str| str.to_owned().into_string().ok())
                    .flatten();

                let config_str = std::fs::read_to_string(file.path())?;
                let mut config = serde_json::from_str::<LSP>(&config_str)?;
                config.id = id;
                Ok(config)
            })
        })
        .filter(|lsp| match lsp {
            Ok(lsp) => lsp.id.is_some(),
            Err(_) => true,
        })
        .collect::<std::io::Result<Vec<_>>>()?;
    send!({ "type": "lsp-entries", "data": files })?;
    Ok(())
}

async fn update(version: &str) -> anyhow::Result<()> {
    let _lock = dotlock::DotlockOptions::new()
        .tries(1)
        .stale_age(Duration::from_secs(60))
        .create(".update-lock");

    let mut is_updating = false;
    if let Err(err) = _lock {
        if err.kind() == ErrorKind::TimedOut {
            // Another process is already updating the executable
            is_updating = true;
        } else {
            return Err(err.into())
        }
    }

    let should_update = std::option_env!("CX_VERSION")
        .map(|ver| ver.trim_start_matches('v') != version)
        .unwrap_or(false);

    send!({ "type": "ensure-version", "updating": is_updating || should_update })?;
    if is_updating || !should_update {
        return Ok(())
    }

    let release = self_update::backends::github::ReleaseList::configure()
        .repo_owner("micha4w")
        .repo_name("cx-master")
        .build()?
        .fetch()?
        .into_iter()
        .find(|rel| rel.version == version)
        .ok_or(anyhow!("Failed to find the GitHub Release to update to"))?;

    let os_string = std::option_env!("CX_OS_STRING")
        .ok_or(anyhow!("Executable was built without the correct Environment Variables"))?;

    let asset = release.assets.iter()
        .find(|asset| asset.name.contains(os_string))
        .ok_or(anyhow!("Failed to find the correct Binary"))?;

    let tmp_dir = tempfile::Builder::new()
        .prefix("self_update")
        .tempdir_in(::std::env::current_dir()?)?;

    time::sleep(time::Duration::from_secs(5)).await;
    let tmp_tarball_path = tmp_dir.path().join(&asset.name);
    let tmp_tarball = ::std::fs::File::create(&tmp_tarball_path)?;

    self_update::Download::from_url(&asset.download_url)
        .set_header(reqwest::header::ACCEPT, "application/octet-stream".parse()?)
        .download_to(&tmp_tarball)?;

    let bin_name = std::path::PathBuf::from("self_update_bin");
    self_update::Extract::from_source(&tmp_tarball_path)
        // .archive(self_update::ArchiveKind::Tar(Some(self_update::Compression::Gz)))
        .extract_file(&tmp_dir.path(), &bin_name)?;

    let new_exe = tmp_dir.path().join(bin_name);
    self_replace::self_replace(new_exe)?;

    Ok(())
}

#[tokio::main]
async fn main() {
    panic::set_hook(Box::new(handle_panic));

    let result: anyhow::Result<()> = (async {

        let start = read_browser_message(tokio::io::stdin()).await?;
        match start["type"].as_str() {
            Some("ensure-version") => {
                let version = start["version"]
                    .as_str()
                    .ok_or(anyhow!("Ensure version command doesn't include version"))?
                    .trim_start_matches('v');

                update(version).await
            },
            Some("start") => {
                let lsp_entry = start["id"]
                    .as_str()
                    .ok_or(anyhow!("Start command doesn't include LSP id"))?;
                run_lsp(&lsp_entry.to_owned()).await
            }
            Some("list-lsps") => list_lsps(),
            _ => {
                send!({ "type": "error", "data": "Start command didn't get sent" })?;
                Ok(())
            }
        }
    })
    .await;
    if let Err(err) = result {
        send!({ "type": "error", "data": &std::format!("{:?}", err) }).unwrap();
    }
}
