//! 插件提权通信辅助模块
//!
//! 在提权模式（`--elevated` 参数）下创建 Windows 命名管道服务端，
//! 替代 stdin/stdout 与 Core 通信。
//!
//! 用法：
//! ```ignore
//! fn main() {
//!     if my_dt_elevated::is_elevated() {
//!         my_dt_elevated::run_elevated(run_normal);
//!     } else {
//!         run_normal(io::stdin().lock(), io::stdout().lock());
//!     }
//! }
//! ```

use std::io::{self, BufReader, BufWriter};

/// 检查是否以提权模式启动（Core 传递 `--elevated` 参数）
pub fn is_elevated() -> bool {
    std::env::args().any(|a| a == "--elevated")
}

/// 提权模式：创建命名管道服务端，等待 Core 连接，然后执行回调
#[cfg(windows)]
pub fn run_elevated<F: FnOnce(BufReader<&std::fs::File>, &mut BufWriter<&std::fs::File>)>(callback: F) {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use std::os::windows::io::FromRawHandle;

    // 获取插件 ID（从可执行文件名推断）
    let exe_name = std::env::current_exe()
        .ok()
        .and_then(|p| {
            p.file_stem()
                .map(|s| s.to_string_lossy().replace("-sidecar", ""))
        })
        .unwrap_or_else(|| "unknown".to_string());

    let pipe_name = format!(r"\\.\pipe\mdt-{}", exe_name);
    let wide: Vec<u16> = OsStr::new(&pipe_name)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    const PIPE_ACCESS_DUPLEX: u32 = 0x00000003;
    const PIPE_TYPE_BYTE: u32 = 0x00000000;
    const PIPE_READMODE_BYTE: u32 = 0x00000000;
    const PIPE_WAIT: u32 = 0x00000000;
    const PIPE_UNLIMITED_INSTANCES: u32 = 255;
    const INVALID_HANDLE_VALUE: isize = -1;

    extern "system" {
        fn CreateNamedPipeW(
            lpName: *const u16,
            dwOpenMode: u32,
            dwPipeMode: u32,
            nMaxInstances: u32,
            nOutBufferSize: u32,
            nInBufferSize: u32,
            nDefaultTimeOut: u32,
            lpSecurityAttributes: *mut std::ffi::c_void,
        ) -> isize;
        fn ConnectNamedPipe(hNamedPipe: isize, lpOverlapped: *mut std::ffi::c_void) -> i32;
        fn ConvertStringSecurityDescriptorToSecurityDescriptorW(
            lpStringSecurityDescriptor: *const u16,
            dwRevision: u32,
            lpSecurityDescriptor: *mut *mut std::ffi::c_void,
            lpSecurityDescriptorSize: *mut u32,
        ) -> i32;
        fn LocalFree(hMem: *mut std::ffi::c_void) -> isize;
    }

    // 构造安全描述符，允许所有用户连接（跨 UAC 安全上下文）
    // SDDL: D:(A;;GA;;;WD) = Allow Generic All to World
    let sddl: Vec<u16> = "D:(A;;GA;;;WD)\0".encode_utf16().collect();
    let mut sd_ptr: *mut std::ffi::c_void = std::ptr::null_mut();
    let mut sd_size: u32 = 0;

    let sd_ok = unsafe {
        ConvertStringSecurityDescriptorToSecurityDescriptorW(
            sddl.as_ptr(),
            1, // SDDL_REVISION_1
            &mut sd_ptr,
            &mut sd_size,
        )
    };

    // Windows API 结构体：字段名保留 Win32 原始匈牙利命名，便于与官方文档对照
    #[repr(C)]
    #[allow(non_snake_case)]
    struct SECURITY_ATTRIBUTES {
        nLength: u32,
        lpSecurityDescriptor: *mut std::ffi::c_void,
        bInheritHandle: i32,
    }

    let sa = if sd_ok != 0 {
        SECURITY_ATTRIBUTES {
            nLength: std::mem::size_of::<SECURITY_ATTRIBUTES>() as u32,
            lpSecurityDescriptor: sd_ptr,
            bInheritHandle: 0,
        }
    } else {
        eprintln!("[ELEVATED] 警告: 安全描述符创建失败，管道可能无法跨权限访问");
        SECURITY_ATTRIBUTES {
            nLength: std::mem::size_of::<SECURITY_ATTRIBUTES>() as u32,
            lpSecurityDescriptor: std::ptr::null_mut(),
            bInheritHandle: 0,
        }
    };

    let h = unsafe {
        CreateNamedPipeW(
            wide.as_ptr(),
            PIPE_ACCESS_DUPLEX,
            PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT,
            PIPE_UNLIMITED_INSTANCES,
            65536,
            65536,
            0,
            &sa as *const SECURITY_ATTRIBUTES as *mut std::ffi::c_void,
        )
    };

    // 释放安全描述符
    if sd_ok != 0 {
        unsafe { LocalFree(sd_ptr) };
    }

    if h == INVALID_HANDLE_VALUE {
        eprintln!("[ELEVATED] 创建命名管道失败: {}", pipe_name);
        std::process::exit(1);
    }

    eprintln!("[ELEVATED] 命名管道已创建: {} (等待 Core 连接...)", pipe_name);

    let connected = unsafe { ConnectNamedPipe(h, std::ptr::null_mut()) };
    if connected == 0 {
        let err = io::Error::last_os_error();
        if err.raw_os_error() != Some(535) {
            eprintln!("[ELEVATED] 等待管道连接失败: {:?}", err);
            std::process::exit(1);
        }
    }

    eprintln!("[ELEVATED] Core 已连接命名管道");

    let raw = h as *mut std::ffi::c_void;
    let pipe_file = unsafe { std::fs::File::from_raw_handle(raw) };
    let reader = BufReader::new(&pipe_file);
    let mut writer = BufWriter::new(&pipe_file);

    callback(reader, &mut writer);
}

#[cfg(not(windows))]
pub fn run_elevated(_callback: fn(BufReader<&std::fs::File>, &mut BufWriter<&std::fs::File>)) {
    eprintln!("[ERROR] 提权模式仅支持 Windows");
    std::process::exit(1);
}
