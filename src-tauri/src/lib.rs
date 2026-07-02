use mlua::{Lua, LuaSerdeExt, MultiValue, Table, Value};
use redis::{Client, Connection, RedisError, Value as RedisValue};
use serde::{Deserialize, Serialize};
use serde_json::{Map as JsonMap, Number as JsonNumber, Value as JsonValue};
use sha1::{Digest, Sha1};
use std::sync::{Arc, Mutex};
use std::time::Instant;

#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
enum RedisLuaExecutionMode {
    #[default]
    Proxy,
    Eval,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RedisLuaDebugRequest {
    redis_url: String,
    script: String,
    keys: Vec<String>,
    argv: Vec<String>,
    #[serde(default)]
    execution_mode: RedisLuaExecutionMode,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RedisLuaTraceEntry {
    index: usize,
    command: String,
    args: Vec<String>,
    duration_ms: f64,
    ok: bool,
    reply_preview: Option<String>,
    error: Option<String>,
    source_line: Option<usize>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RedisLuaLogEntry {
    level: String,
    message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RedisLuaDebugResponse {
    success: bool,
    mode: RedisLuaExecutionMode,
    result_preview: String,
    error: Option<String>,
    trace: Vec<RedisLuaTraceEntry>,
    logs: Vec<RedisLuaLogEntry>,
}

#[tauri::command]
fn run_redis_lua_debug(request: RedisLuaDebugRequest) -> Result<RedisLuaDebugResponse, String> {
    if request.redis_url.trim().is_empty() {
        return Err("Redis 地址不能为空。".to_string());
    }

    if request.script.trim().is_empty() {
        return Err("Lua 脚本不能为空。".to_string());
    }

    match request.execution_mode {
        RedisLuaExecutionMode::Proxy => run_proxy_debug(request),
        RedisLuaExecutionMode::Eval => run_eval_debug(request),
    }
}

fn run_proxy_debug(request: RedisLuaDebugRequest) -> Result<RedisLuaDebugResponse, String> {
    let client = Client::open(request.redis_url.as_str()).map_err(|error| error.to_string())?;
    let connection = Arc::new(Mutex::new(
        client
            .get_connection()
            .map_err(|error| format!("连接 Redis 失败：{error}"))?,
    ));
    let trace_entries = Arc::new(Mutex::new(Vec::<RedisLuaTraceEntry>::new()));
    let log_entries = Arc::new(Mutex::new(Vec::<RedisLuaLogEntry>::new()));

    let lua = Lua::new();
    install_redis_globals(
        &lua,
        &request,
        Arc::clone(&connection),
        Arc::clone(&trace_entries),
        Arc::clone(&log_entries),
    )
    .map_err(|error| error.to_string())?;
    install_cjson_module(&lua).map_err(|error| error.to_string())?;

    let response = match lua.load(&request.script).eval::<Value>() {
        Ok(result) => {
            let result_preview = format_json_preview(&lua_value_to_json(&result).map_err(|error| error.to_string())?);
            RedisLuaDebugResponse {
                success: true,
                mode: RedisLuaExecutionMode::Proxy,
                result_preview,
                error: None,
                trace: lock_mutex(&trace_entries)?,
                logs: lock_mutex(&log_entries)?,
            }
        }
        Err(error) => RedisLuaDebugResponse {
            success: false,
            mode: RedisLuaExecutionMode::Proxy,
            result_preview: String::new(),
            error: Some(error.to_string()),
            trace: lock_mutex(&trace_entries)?,
            logs: lock_mutex(&log_entries)?,
        },
    };

    Ok(response)
}

fn run_eval_debug(request: RedisLuaDebugRequest) -> Result<RedisLuaDebugResponse, String> {
    let client = Client::open(request.redis_url.as_str()).map_err(|error| error.to_string())?;
    let mut connection = client
        .get_connection()
        .map_err(|error| format!("连接 Redis 失败：{error}"))?;

    let started_at = Instant::now();
    let result = run_eval_command(&mut connection, &request);
    let duration_ms = started_at.elapsed().as_secs_f64() * 1000.0;

    match result {
        Ok(value) => {
            let result_preview = format_json_preview(&redis_value_to_json(&value));
            Ok(RedisLuaDebugResponse {
                success: true,
                mode: RedisLuaExecutionMode::Eval,
                result_preview: result_preview.clone(),
                error: None,
                trace: vec![RedisLuaTraceEntry {
                    index: 1,
                    command: "EVAL".to_string(),
                    args: build_eval_trace_args(&request),
                    duration_ms,
                    ok: true,
                    reply_preview: Some(result_preview),
                    error: None,
                    source_line: None,
                }],
                logs: Vec::new(),
            })
        }
        Err(error) => Ok(RedisLuaDebugResponse {
            success: false,
            mode: RedisLuaExecutionMode::Eval,
            result_preview: String::new(),
            error: Some(error.to_string()),
            trace: vec![RedisLuaTraceEntry {
                index: 1,
                command: "EVAL".to_string(),
                args: build_eval_trace_args(&request),
                duration_ms,
                ok: false,
                reply_preview: None,
                error: Some(error.to_string()),
                source_line: None,
            }],
            logs: Vec::new(),
        }),
    }
}

fn install_redis_globals(
    lua: &Lua,
    request: &RedisLuaDebugRequest,
    connection: Arc<Mutex<Connection>>,
    trace_entries: Arc<Mutex<Vec<RedisLuaTraceEntry>>>,
    log_entries: Arc<Mutex<Vec<RedisLuaLogEntry>>>,
) -> mlua::Result<()> {
    lua.globals()
        .set("KEYS", create_lua_string_array(lua, &request.keys)?)?;
    lua.globals()
        .set("ARGV", create_lua_string_array(lua, &request.argv)?)?;

    let redis_table = lua.create_table()?;
    redis_table.set("LOG_DEBUG", "DEBUG")?;
    redis_table.set("LOG_VERBOSE", "VERBOSE")?;
    redis_table.set("LOG_NOTICE", "NOTICE")?;
    redis_table.set("LOG_WARNING", "WARNING")?;

    let call_connection = Arc::clone(&connection);
    let call_trace_entries = Arc::clone(&trace_entries);
    redis_table.set(
        "call",
        lua.create_function(move |lua, args: MultiValue| {
            execute_redis_proxy_call(lua, args, false, &call_connection, &call_trace_entries)
        })?,
    )?;

    let pcall_connection = Arc::clone(&connection);
    let pcall_trace_entries = Arc::clone(&trace_entries);
    redis_table.set(
        "pcall",
        lua.create_function(move |lua, args: MultiValue| {
            execute_redis_proxy_call(lua, args, true, &pcall_connection, &pcall_trace_entries)
        })?,
    )?;

    let log_log_entries = Arc::clone(&log_entries);
    redis_table.set(
        "log",
        lua.create_function(move |_, args: MultiValue| {
            let values = args.into_vec();
            let level = match values.first().cloned() {
                Some(value) => stringify_lua_argument(value)?,
                None => "NOTICE".to_string(),
            };
            let message = values
                .iter()
                .skip(1)
                .cloned()
                .map(stringify_lua_argument)
                .collect::<mlua::Result<Vec<_>>>()?
                .join(" ");

            let mut entries = log_log_entries
                .lock()
                .map_err(|_| mlua::Error::RuntimeError("日志缓冲区已损坏。".to_string()))?;
            entries.push(RedisLuaLogEntry { level, message });
            Ok(())
        })?,
    )?;

    redis_table.set(
        "sha1hex",
        lua.create_function(|_, value: String| {
            let mut hasher = Sha1::new();
            hasher.update(value.as_bytes());
            Ok(format!("{:x}", hasher.finalize()))
        })?,
    )?;

    lua.globals().set("redis", redis_table)?;
    Ok(())
}

fn install_cjson_module(lua: &Lua) -> mlua::Result<()> {
    let cjson = lua.create_table()?;
    cjson.set(
        "encode",
        lua.create_function(|lua, value: Value| {
            let json = lua_value_to_json(&value)?;
            let payload =
                serde_json::to_string(&json).map_err(|error| mlua::Error::RuntimeError(error.to_string()))?;
            lua.create_string(payload.as_bytes())
        })?,
    )?;
    cjson.set(
        "decode",
        lua.create_function(|lua, value: String| {
            let json: JsonValue =
                serde_json::from_str(&value).map_err(|error| mlua::Error::RuntimeError(error.to_string()))?;
            lua.to_value(&json)
        })?,
    )?;

    lua.globals().set("cjson", cjson)?;
    Ok(())
}

fn create_lua_string_array(lua: &Lua, values: &[String]) -> mlua::Result<Table> {
    let table = lua.create_table()?;
    for (index, value) in values.iter().enumerate() {
        table.set(index + 1, value.as_str())?;
    }
    Ok(table)
}

fn execute_redis_proxy_call(
    lua: &Lua,
    args: MultiValue,
    protected: bool,
    connection: &Arc<Mutex<Connection>>,
    trace_entries: &Arc<Mutex<Vec<RedisLuaTraceEntry>>>,
) -> mlua::Result<Value> {
    let values = args.into_vec();
    let (command, command_args) = split_command(values)?;
    let source_line = lua
        .inspect_stack(1)
        .map(|debug| debug.curr_line())
        .filter(|line| *line > 0)
        .map(|line| line as usize);
    let started_at = Instant::now();
    let query_result = run_redis_command(connection, &command, &command_args);
    let duration_ms = started_at.elapsed().as_secs_f64() * 1000.0;

    match query_result {
        Ok(redis_value) => {
            let reply_preview = format_json_preview(&redis_value_to_json(&redis_value));
            push_trace_entry(
                trace_entries,
                command.clone(),
                command_args.clone(),
                duration_ms,
                true,
                Some(reply_preview),
                None,
                source_line,
            )?;
            redis_value_to_lua(lua, redis_value)
        }
        Err(error) => {
            let error_message = error.to_string();
            push_trace_entry(
                trace_entries,
                command,
                command_args,
                duration_ms,
                false,
                None,
                Some(error_message.clone()),
                source_line,
            )?;

            if protected {
                let table = lua.create_table()?;
                table.set("err", error_message)?;
                Ok(Value::Table(table))
            } else {
                Err(mlua::Error::RuntimeError(error_message))
            }
        }
    }
}

fn split_command(values: Vec<Value>) -> mlua::Result<(String, Vec<String>)> {
    let (first, rest) = values
        .split_first()
        .ok_or_else(|| mlua::Error::RuntimeError("redis.call 至少需要一个命令名。".to_string()))?;

    let command = stringify_lua_argument(first.clone())?;
    let command_args = rest
        .iter()
        .cloned()
        .map(stringify_lua_argument)
        .collect::<mlua::Result<Vec<_>>>()?;

    Ok((command, command_args))
}

fn run_redis_command(
    connection: &Arc<Mutex<Connection>>,
    command: &str,
    args: &[String],
) -> Result<RedisValue, RedisError> {
    let mut cmd = redis::cmd(command);
    for argument in args {
        cmd.arg(argument);
    }

    let mut locked_connection = connection
        .lock()
        .map_err(|_| RedisError::from((redis::ErrorKind::IoError, "Redis 连接状态损坏")))?;
    cmd.query(&mut *locked_connection)
}

fn run_eval_command(connection: &mut Connection, request: &RedisLuaDebugRequest) -> Result<RedisValue, RedisError> {
    let mut cmd = redis::cmd("EVAL");
    cmd.arg(request.script.as_str());
    cmd.arg(request.keys.len());
    for key in &request.keys {
        cmd.arg(key);
    }
    for arg in &request.argv {
        cmd.arg(arg);
    }
    cmd.query(connection)
}

fn push_trace_entry(
    trace_entries: &Arc<Mutex<Vec<RedisLuaTraceEntry>>>,
    command: String,
    args: Vec<String>,
    duration_ms: f64,
    ok: bool,
    reply_preview: Option<String>,
    error: Option<String>,
    source_line: Option<usize>,
) -> mlua::Result<()> {
    let mut entries = trace_entries
        .lock()
        .map_err(|_| mlua::Error::RuntimeError("调试轨迹缓冲区已损坏。".to_string()))?;
    let next_index = entries.len() + 1;
    entries.push(RedisLuaTraceEntry {
        index: next_index,
        command,
        args,
        duration_ms,
        ok,
        reply_preview,
        error,
        source_line,
    });
    Ok(())
}

fn redis_value_to_lua(lua: &Lua, value: RedisValue) -> mlua::Result<Value> {
    match value {
        RedisValue::Nil => Ok(Value::Boolean(false)),
        RedisValue::Int(number) => Ok(Value::Integer(number)),
        RedisValue::BulkString(bytes) => Ok(Value::String(lua.create_string(bytes.as_slice())?)),
        RedisValue::Array(values) => {
            let table = lua.create_table()?;
            for (index, entry) in values.into_iter().enumerate() {
                table.set(index + 1, redis_value_to_lua(lua, entry)?)?;
            }
            Ok(Value::Table(table))
        }
        RedisValue::SimpleString(value) => {
            let table = lua.create_table()?;
            table.set("ok", value)?;
            Ok(Value::Table(table))
        }
        RedisValue::Okay => {
            let table = lua.create_table()?;
            table.set("ok", "OK")?;
            Ok(Value::Table(table))
        }
        RedisValue::Map(values) => {
            let table = lua.create_table()?;
            for (key, value) in values {
                table.set(
                    redis_value_to_lua(lua, key)?,
                    redis_value_to_lua(lua, value)?,
                )?;
            }
            Ok(Value::Table(table))
        }
        RedisValue::Attribute { data, attributes: _ } => redis_value_to_lua(lua, *data),
        RedisValue::Set(values) | RedisValue::Push { data: values, kind: _ } => {
            let table = lua.create_table()?;
            for (index, entry) in values.into_iter().enumerate() {
                table.set(index + 1, redis_value_to_lua(lua, entry)?)?;
            }
            Ok(Value::Table(table))
        }
        RedisValue::Double(value) => Ok(Value::Number(value)),
        RedisValue::Boolean(value) => Ok(Value::Boolean(value)),
        RedisValue::VerbatimString { text, format: _ } => Ok(Value::String(lua.create_string(text.as_bytes())?)),
        RedisValue::BigNumber(value) => Ok(Value::String(lua.create_string(value.to_string().as_bytes())?)),
        RedisValue::ServerError(error) => {
            let table = lua.create_table()?;
            let formatted_error = match error.details() {
                Some(detail) if !detail.is_empty() => format!("{} {}", error.code(), detail),
                _ => error.code().to_string(),
            };
            table.set("err", formatted_error)?;
            Ok(Value::Table(table))
        }
    }
}

fn redis_value_to_json(value: &RedisValue) -> JsonValue {
    match value {
        RedisValue::Nil => JsonValue::Null,
        RedisValue::Int(number) => JsonValue::Number((*number).into()),
        RedisValue::BulkString(bytes) => JsonValue::String(String::from_utf8_lossy(bytes).into_owned()),
        RedisValue::Array(values) => JsonValue::Array(values.iter().map(redis_value_to_json).collect()),
        RedisValue::SimpleString(value) => json_object([("ok", JsonValue::String(value.clone()))]),
        RedisValue::Okay => json_object([("ok", JsonValue::String("OK".to_string()))]),
        RedisValue::Map(values) => JsonValue::Array(
            values
                .iter()
                .map(|(key, value)| json_object([("key", redis_value_to_json(key)), ("value", redis_value_to_json(value))]))
                .collect(),
        ),
        RedisValue::Attribute { data, attributes } => json_object([
            ("data", redis_value_to_json(data)),
            (
                "attributes",
                JsonValue::Array(
                    attributes
                        .iter()
                        .map(|(key, value)| {
                            json_object([("key", redis_value_to_json(key)), ("value", redis_value_to_json(value))])
                        })
                        .collect(),
                ),
            ),
        ]),
        RedisValue::Set(values) => JsonValue::Array(values.iter().map(redis_value_to_json).collect()),
        RedisValue::Push { data, kind: _ } => JsonValue::Array(data.iter().map(redis_value_to_json).collect()),
        RedisValue::Double(value) => JsonNumber::from_f64(*value)
            .map(JsonValue::Number)
            .unwrap_or_else(|| JsonValue::String(value.to_string())),
        RedisValue::Boolean(value) => JsonValue::Bool(*value),
        RedisValue::VerbatimString { text, format } => json_object([
            ("format", JsonValue::String(format.to_string())),
            ("text", JsonValue::String(text.clone())),
        ]),
        RedisValue::BigNumber(value) => JsonValue::String(value.to_string()),
        RedisValue::ServerError(error) => {
            let formatted_error = match error.details() {
                Some(detail) if !detail.is_empty() => format!("{} {}", error.code(), detail),
                _ => error.code().to_string(),
            };
            json_object([("err", JsonValue::String(formatted_error))])
        }
    }
}

fn lua_value_to_json(value: &Value) -> mlua::Result<JsonValue> {
    match value {
        Value::Nil => Ok(JsonValue::Null),
        Value::Boolean(value) => Ok(JsonValue::Bool(*value)),
        Value::Integer(value) => Ok(JsonValue::Number((*value).into())),
        Value::Number(value) => Ok(JsonNumber::from_f64(*value)
            .map(JsonValue::Number)
            .unwrap_or_else(|| JsonValue::String(value.to_string()))),
        Value::String(value) => Ok(JsonValue::String(String::from_utf8_lossy(value.as_bytes().as_ref()).into_owned())),
        Value::Table(table) => lua_table_to_json(table),
        Value::LightUserData(_)
        | Value::Function(_)
        | Value::Thread(_)
        | Value::UserData(_)
        | Value::Error(_)
        | Value::Other(_) => Ok(JsonValue::String("<unsupported lua value>".to_string())),
    }
}

fn lua_table_to_json(table: &Table) -> mlua::Result<JsonValue> {
    let sequence_length = table.raw_len();
    let pair_count = table.clone().pairs::<Value, Value>().count();

    if sequence_length > 0 && sequence_length == pair_count {
        let mut array = Vec::with_capacity(sequence_length);
        for value in table.sequence_values::<Value>() {
            array.push(lua_value_to_json(&value?)?);
        }
        return Ok(JsonValue::Array(array));
    }

    let mut object = JsonMap::new();
    for pair in table.pairs::<Value, Value>() {
        let (key, value) = pair?;
        object.insert(stringify_lua_argument(key)?, lua_value_to_json(&value)?);
    }
    Ok(JsonValue::Object(object))
}

fn stringify_lua_argument(value: Value) -> mlua::Result<String> {
    match value {
        Value::Nil => Ok(String::new()),
        Value::Boolean(value) => Ok(if value { "true".to_string() } else { "false".to_string() }),
        Value::Integer(value) => Ok(value.to_string()),
        Value::Number(value) => Ok(value.to_string()),
        Value::String(value) => Ok(String::from_utf8_lossy(value.as_bytes().as_ref()).into_owned()),
        Value::Table(_) => Err(mlua::Error::RuntimeError(
            "redis.call 参数暂不支持直接传 Lua table，请先转成字符串。".to_string(),
        )),
        Value::LightUserData(_) | Value::Function(_) | Value::Thread(_) | Value::UserData(_) | Value::Error(_) => {
            Err(mlua::Error::RuntimeError("redis.call 参数类型不受支持。".to_string()))
        }
        Value::Other(_) => Err(mlua::Error::RuntimeError("redis.call 参数类型不受支持。".to_string())),
    }
}

fn format_json_preview(value: &JsonValue) -> String {
    match value {
        JsonValue::String(text) => text.clone(),
        JsonValue::Null => "null".to_string(),
        JsonValue::Bool(value) => value.to_string(),
        JsonValue::Number(value) => value.to_string(),
        JsonValue::Array(_) | JsonValue::Object(_) => {
            serde_json::to_string_pretty(value).unwrap_or_else(|_| value.to_string())
        }
    }
}

fn build_eval_trace_args(request: &RedisLuaDebugRequest) -> Vec<String> {
    let mut args = vec![format!("numkeys={}", request.keys.len())];
    args.extend(request.keys.iter().map(|value| format!("KEYS:{value}")));
    args.extend(request.argv.iter().map(|value| format!("ARGV:{value}")));
    args
}

fn json_object<const N: usize>(entries: [(&str, JsonValue); N]) -> JsonValue {
    JsonValue::Object(entries.into_iter().map(|(key, value)| (key.to_string(), value)).collect())
}

fn lock_mutex<T: Clone>(mutex: &Arc<Mutex<T>>) -> Result<T, String> {
    mutex
        .lock()
        .map(|value| value.clone())
        .map_err(|_| "调试结果缓冲区已损坏。".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![run_redis_lua_debug])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
