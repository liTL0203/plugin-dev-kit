//! {{PLUGIN_NAME}} Sidecar
//!
//! 通过 stdin/stdout（普通模式）或命名管道（提权模式 `--elevated`）与 Core 进行 JSON-RPC 通信。

// Windows 下隐藏控制台窗口
#![cfg_attr(windows, windows_subsystem = "windows")]

mod elevated;

use serde_json::Value;
use std::io::{self, BufRead, Write};

fn main() {
    if elevated::is_elevated() {
        elevated::run_elevated(|reader, writer| run_event_loop(reader, writer));
    } else {
        let stdin = io::stdin();
        let stdout = io::stdout();
        run_event_loop(stdin.lock(), &mut stdout.lock());
    }
}

/// 主事件循环：读取 JSON-RPC 请求 → 处理 → 返回响应
fn run_event_loop<R: BufRead, W: Write>(mut reader: R, writer: &mut W) {
    for line in reader.lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => continue,
        };
        if let Some(resp) = handle_message(&line) {
            if writeln!(writer, "{}", resp).is_err() || writer.flush().is_err() {
                break;
            }
        }
    }
}

/// 处理收到的 JSON-RPC 消息
fn handle_message(json: &str) -> Option<String> {
    let value: Value = serde_json::from_str(json).ok()?;
    let method = value.get("method")?.as_str()?;
    let id = value.get("id")?;

    match method {
        "ping" => Some(build_response(id, "pong", None)),
        "initialize" => Some(initialize(id)),
        _ => Some(build_error(id, -32601, "Method not found")),
    }
}

/// 初始化插件
fn initialize(id: &Value) -> String {
    let mut result = serde_json::Map::new();
    result.insert("id".to_string(), Value::String("{{PLUGIN_ID}}".to_string()));
    result.insert("name".to_string(), Value::String("{{PLUGIN_NAME}}".to_string()));
    result.insert("version".to_string(), Value::String("0.1.0".to_string()));
    build_response(id, "initialized", Some(Value::Object(result)))
}

fn build_response(id: &Value, result: impl Into<Value>, data: Option<Value>) -> String {
    let mut resp = serde_json::Map::new();
    resp.insert("jsonrpc".to_string(), Value::String("2.0".to_string()));
    let mut result_obj = serde_json::Map::new();
    result_obj.insert("status".to_string(), Value::String("ok".to_string()));
    result_obj.insert("result".to_string(), result.into());
    if let Some(d) = data {
        result_obj.insert("data".to_string(), d);
    }
    resp.insert("result".to_string(), Value::Object(result_obj));
    resp.insert("id".to_string(), id.clone());
    Value::Object(resp).to_string()
}

fn build_error(id: &Value, code: i32, message: &str) -> String {
    let mut resp = serde_json::Map::new();
    resp.insert("jsonrpc".to_string(), Value::String("2.0".to_string()));
    let mut error = serde_json::Map::new();
    error.insert("code".to_string(), Value::Number(code.into()));
    error.insert("message".to_string(), Value::String(message.to_string()));
    resp.insert("error".to_string(), Value::Object(error));
    resp.insert("id".to_string(), id.clone());
    Value::Object(resp).to_string()
}
