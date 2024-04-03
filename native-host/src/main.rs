use std::{io::Write, panic, path::Path, sync::Arc};

use anyhow::anyhow;
use serde_json::{json, Value};
use std::str;
use tokio::{
    io::{AsyncBufReadExt, AsyncRead, AsyncReadExt, AsyncWriteExt, BufReader},
    process::{ChildStdin, Command},
    sync::Mutex,
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

        if header == 0 {
            return Err(std::io::Error::new(std::io::ErrorKind::BrokenPipe, "Stdout closed by LSP"));
        }

        if header == "\r\n" {
            break;
        }

        let header_parts = header.split(": ").collect::<Vec<&str>>();
        // send!({ "type": "log", "header": header_parts })?;
        if header_parts.len() != 2 {
            return Err(anyhow!("Header sent by LSP is invalid: '".to_owned() + &header + "'"));
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

    let config_str = std::fs::read_to_string(config_path).map_err(|e| {
        anyhow!(
            "Failed to read lsp config file {}: {}",
            config_path.display(),
            e.to_string()
        )
    })?;
    let config = serde_json::from_str::<LSP>(&config_str)?;

    // send!({ "type": "log", "data": "Read config file" })?;
    let temp = Arc::new(tempfile::tempdir()?);
    // send!({ "type": "log", "data": "Created temp dir" })?;

    let lsp = Arc::new(Mutex::new(
        Command::new(&config.command)
            .args(config.args.unwrap_or(Vec::new()))
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            // .stderr(
            //     std::fs::File::create("/home/micha4w/Code/JS/cx-master/native-host/stderr")
            //         .unwrap(),
            // )
            .current_dir(temp.path())
            .spawn()
            .map_err(|e| {
                anyhow!(
                    "Failed to start '{}' process: {}",
                    &config.command,
                    e.to_string()
                )
            })?,
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

fn create_file_lock() -> anyhow::Result<Option<&'static str>> {
    let path = ".update-lock";

    let mut i = 0;
    loop {
        i += 1;
        if i > 2 {
            return Err(anyhow!("Failed to create Lock File"));
        }

        let lock = std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&path);
        match lock {
            Err(err) => {
                if err.kind() == std::io::ErrorKind::AlreadyExists {
                    let time: chrono::DateTime<chrono::Utc> =
                        std::fs::read_to_string(&path)?.parse()?;
                    if chrono::Utc::now() - time > chrono::Duration::try_minutes(2).unwrap() {
                        std::fs::remove_file(&path)?;
                        continue;
                    } else {
                        return Ok(None);
                    }
                }

                return Err(err.into());
            }
            Ok(file) => {
                write!(&file, "{}", chrono::Utc::now())?;
                return Ok(Some(path));
            }
        }
    }
}
async fn ensure_version(version: String) -> anyhow::Result<()> {
    let should_update = std::option_env!("CX_VERSION")
        .map(|ver| ver.trim_start_matches('v') != version)
        .unwrap_or(false);

    if !should_update {
        send!({ "type": "ensure-version", "status": "already-updated" })?;
        return Ok(());
    }

    let lock = create_file_lock()?;
    let already_updating = lock.is_none();
    if already_updating {
        send!({ "type": "ensure-version", "status": "already-updating" })?;
        return Ok(());
    }

    let release = tokio::task::spawn_blocking(move || {
        self_update::backends::github::ReleaseList::configure()
            .repo_owner("micha4w")
            .repo_name("cx-master")
            .build()?
            .fetch()?
            .into_iter()
            .find(|rel| rel.version == version)
            .ok_or(anyhow!("Failed to find the GitHub Release to update to"))
    }).await??;

    println!("release: {:?}", release);
    let os_string = std::option_env!("CX_OS_STRING").ok_or(anyhow!(
        "Executable was built without the correct Environment Variables"
    ))?;

    let asset = release
        .assets
        .iter()
        .find(|asset| asset.name.contains(os_string))
        .ok_or(anyhow!("Failed to find the correct Binary"))?
        .clone();
    println!("asset: {:?}", asset);

    let tmp_dir = tempfile::Builder::new()
        .prefix("self_update")
        .tempdir_in(std::env::current_dir()?)?;

    let bin_path = tmp_dir.path().join(&asset.name);
    let bin = std::fs::File::create(&bin_path)?;

    tokio::task::spawn_blocking::<_, anyhow::Result<()>>(move || {
        self_update::Download::from_url(&asset.download_url)
            .set_header(reqwest::header::ACCEPT, "application/octet-stream".parse()?)
            .download_to(&bin)?;
        Ok(())
    }).await??;

    self_replace::self_replace(bin_path)?;
    std::fs::remove_file(lock.unwrap())?;
    
    send!({ "type": "ensure-version", "status": "updated" })?;
    Ok(())
}

#[tokio::main]
async fn main() {
    if std::env::args().any(|arg| arg == "--version") {
        match std::option_env!("CX_VERSION") {
            Some(ver) => println!("{}", ver),
            None => println!("Compiled without a version"),
        }
        return;
    }

    panic::set_hook(Box::new(handle_panic));

    let result: anyhow::Result<()> = (async {
        ensure_version("1.2.4".to_owned()).await?;
        return Ok(());

        let start = read_browser_message(tokio::io::stdin()).await?;
        match start["type"].as_str() {
            Some("ensure-version") => {
                let version = start["version"]
                    .as_str()
                    .ok_or(anyhow!("Ensure version command doesn't include version"))?
                    .trim_start_matches('v');

                ensure_version(version.to_owned()).await
            }
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
