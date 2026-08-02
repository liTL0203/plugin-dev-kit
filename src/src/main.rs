//! {{PLUGIN_NAME}} Sidecar
//!
//! 通过 stdin/stdout（普通模式）或命名管道（提权模式 `--elevated`）与 Core 进行 JSON-RPC 通信。
//!
//! # 敏感数据保护
//!
//! 插件中的敏感信息（API Key、私有 URL、加密密钥等）应使用 `obfstr` 宏进行编译期混淆，
//! 防止通过 `strings` 命令或十六进制编辑器从二进制中提取明文。
//!
//! ## 使用示例
//!
//! ```ignore
//! use obfstr::obfstr as s;
//!
//! fn get_api_key() -> &'static str {
//!     // 编译期 XOR 加密 — 二进制中不存储明文，运行期按需解密
//!     s!("sk-your-secret-api-key-12345")
//! }
//!
//! fn get_service_url() -> &'static str {
//!     s!("https://api.internal-service.example.com/v2/verify")
//! }
//! ```
//!
//! ## 敏感数据架构最佳实践
//!
//! 前端（JS）无法真正隐藏密钥（代码可被格式化阅读），因此遵循以下原则：
//! 1. 所有敏感数据（API Key、Token）存储在 Rust Sidecar 中，使用 `obfstr!()` 保护
//! 2. 前端通过 JSON-RPC 向 Sidecar 请求解密后的数据，不在 JS 中硬编码
//! 3. Sidecar 在运行期按需解密并使用，解密后的明文仅存在于内存中

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
