use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value as JsonValue};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

const DEFAULT_INSTRUCTION_BUDGET: usize = 1_000_000;

#[derive(Debug, Clone, PartialEq)]
enum Value {
    Integer(i64),
    Real(f64),
    String(String),
    Boolean(bool),
    Array(PseudoArray),
    Null,
}

#[derive(Debug, Clone, PartialEq)]
struct PseudoArray {
    bounds: Vec<(i64, i64)>,
    default: Box<Value>,
    store: HashMap<Vec<i64>, Value>,
}

#[derive(Debug, Clone, Deserialize)]
struct RunInput {
    ast_json: String,
    stdin_lines: Vec<String>,
    virtual_files: HashMap<String, Vec<String>>,
    instruction_budget: Option<usize>,
}

#[derive(Debug, Clone, Serialize)]
struct Diagnostic {
    code: String,
    message: String,
    severity: String,
    line: usize,
    column: usize,
    #[serde(rename = "endLine")]
    end_line: usize,
    #[serde(rename = "endColumn")]
    end_column: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    hint: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct RunResult {
    success: bool,
    stdout: String,
    stderr: String,
    diagnostics: Vec<Diagnostic>,
    #[serde(rename = "virtualFiles")]
    virtual_files: HashMap<String, Vec<String>>,
}

#[derive(Debug, Clone)]
struct RuntimeError {
    message: String,
    line: usize,
    column: usize,
}

type RuntimeResult<T> = Result<T, RuntimeError>;

#[derive(Debug, Clone)]
struct FileHandle {
    mode: String,
    pointer: usize,
}

#[derive(Debug, Clone)]
enum Flow {
    Continue,
    Return(Value),
}

struct Runtime {
    ast: JsonValue,
    scopes: Vec<HashMap<String, Value>>,
    type_scopes: Vec<HashMap<String, String>>,
    stdout: Vec<String>,
    stdin_lines: Vec<String>,
    stdin_cursor: usize,
    virtual_files: HashMap<String, Vec<String>>,
    open_files: HashMap<String, FileHandle>,
    functions: HashMap<String, JsonValue>,
    procedures: HashMap<String, JsonValue>,
    remaining_steps: usize,
    rng_state: u64,
}

impl Runtime {
    fn new(input: RunInput) -> RuntimeResult<Self> {
        let ast: JsonValue = serde_json::from_str(&input.ast_json)
            .map_err(|error| RuntimeError::new(format!("Invalid AST JSON: {error}"), 1, 1))?;

        let mut runtime = Self {
            ast,
            scopes: vec![HashMap::new()],
            type_scopes: vec![HashMap::new()],
            stdout: Vec::new(),
            stdin_lines: input.stdin_lines,
            stdin_cursor: 0,
            virtual_files: input.virtual_files,
            open_files: HashMap::new(),
            functions: HashMap::new(),
            procedures: HashMap::new(),
            remaining_steps: input
                .instruction_budget
                .unwrap_or(DEFAULT_INSTRUCTION_BUDGET),
            rng_state: 0x9e37_79b9_7f4a_7c15,
        };
        runtime.collect_routines();
        Ok(runtime)
    }

    fn run(mut self) -> RunResult {
        let outcome = self.execute_main();
        match outcome {
            Ok(_) => RunResult {
                success: true,
                stdout: self.stdout.join("\n"),
                stderr: String::new(),
                diagnostics: Vec::new(),
                virtual_files: self.virtual_files,
            },
            Err(error) => {
                let diagnostic = Diagnostic {
                    code: if error.message.contains("Instruction budget") {
                        "RUN408".to_string()
                    } else {
                        "RUN001".to_string()
                    },
                    message: error.message.clone(),
                    severity: "error".to_string(),
                    line: error.line,
                    column: error.column,
                    end_line: error.line,
                    end_column: error.column,
                    hint: Some("Check pseudocode runtime state and input values.".to_string()),
                };
                RunResult {
                    success: false,
                    stdout: self.stdout.join("\n"),
                    stderr: error.message,
                    diagnostics: vec![diagnostic],
                    virtual_files: self.virtual_files,
                }
            }
        }
    }

    fn execute_main(&mut self) -> RuntimeResult<()> {
        let body = self
            .ast
            .get("body")
            .and_then(JsonValue::as_array)
            .cloned()
            .unwrap_or_default();

        for statement in body {
            let kind = str_field(&statement, "kind");
            if kind == "procedureDefinition" || kind == "functionDefinition" {
                continue;
            }
            if let Flow::Return(_) = self.exec_statement(&statement)? {
                break;
            }
        }
        Ok(())
    }

    fn collect_routines(&mut self) {
        let body = self
            .ast
            .get("body")
            .and_then(JsonValue::as_array)
            .cloned()
            .unwrap_or_default();
        for statement in body {
            match str_field(&statement, "kind").as_str() {
                "procedureDefinition" => {
                    self.procedures
                        .insert(str_field(&statement, "name").to_lowercase(), statement);
                }
                "functionDefinition" => {
                    self.functions
                        .insert(str_field(&statement, "name").to_lowercase(), statement);
                }
                _ => {}
            }
        }
    }

    fn exec_block(&mut self, statements: &[JsonValue]) -> RuntimeResult<Flow> {
        for statement in statements {
            match self.exec_statement(statement)? {
                Flow::Continue => {}
                flow @ Flow::Return(_) => return Ok(flow),
            }
        }
        Ok(Flow::Continue)
    }

    fn exec_statement(&mut self, statement: &JsonValue) -> RuntimeResult<Flow> {
        self.step(statement)?;
        match str_field(statement, "kind").as_str() {
            "declare" => {
                let name = nested_str(statement, &["identifier", "name"]);
                let type_node = statement.get("typeNode").unwrap_or(&JsonValue::Null);
                let value = if str_field(type_node, "kind") == "array" {
                    self.declare_type(&name, &str_field(type_node, "elementType"));
                    let bounds = array_field(type_node, "dimensions")
                        .iter()
                        .map(|dim| (int_field(dim, "lower"), int_field(dim, "upper")))
                        .collect::<Vec<_>>();
                    let default = default_value(&str_field(type_node, "elementType"));
                    Value::Array(PseudoArray {
                        bounds,
                        default: Box::new(default),
                        store: HashMap::new(),
                    })
                } else {
                    self.declare_type(&name, &str_field(type_node, "name"));
                    default_value(&str_field(type_node, "name"))
                };
                self.assign_name(&name, value);
                Ok(Flow::Continue)
            }
            "constant" => {
                let name = nested_str(statement, &["identifier", "name"]);
                let value = self.eval(required(statement, "value")?)?;
                self.declare_type(&name, &value.type_name());
                self.assign_name(&name, value);
                Ok(Flow::Continue)
            }
            "assignment" => {
                let value = self.eval(required(statement, "value")?)?;
                self.assign_target(required(statement, "target")?, value)?;
                Ok(Flow::Continue)
            }
            "input" => {
                let raw = self.read_input(statement)?;
                let target = required(statement, "target")?;
                let value = match self.target_type(statement) {
                    Some(type_name) => coerce_input(&raw, &type_name),
                    None => Value::String(raw),
                };
                self.assign_target(target, value)?;
                Ok(Flow::Continue)
            }
            "output" => {
                let mut line = String::new();
                for expr in array_field(statement, "values") {
                    line.push_str(&self.eval(expr)?.display());
                }
                self.stdout.push(line);
                Ok(Flow::Continue)
            }
            "if" => {
                if self.eval(required(statement, "condition")?)?.truthy() {
                    self.exec_block(array_field(statement, "thenBody"))
                } else {
                    self.exec_block(array_field(statement, "elseBody"))
                }
            }
            "case" => {
                let subject = self.eval(required(statement, "expression")?)?;
                for clause in array_field(statement, "clauses") {
                    let matches = match clause.get("value") {
                        Some(JsonValue::Null) | None => true,
                        Some(value_expr) => values_equal(&subject, &self.eval(value_expr)?),
                    };
                    if matches {
                        return self.exec_statement(required(clause, "statement")?);
                    }
                }
                Ok(Flow::Continue)
            }
            "for" => {
                let iterator = nested_str(statement, &["iterator", "name"]);
                let end = self.eval(required(statement, "endValue")?)?.to_i64();
                let step = match statement.get("stepValue") {
                    Some(JsonValue::Null) | None => 1,
                    Some(expr) => self.eval(expr)?.to_i64(),
                };
                if step == 0 {
                    return Err(RuntimeError::at(statement, "FOR STEP cannot be zero"));
                }
                let mut value = self.eval(required(statement, "startValue")?)?.to_i64();
                loop {
                    if (step > 0 && value > end) || (step < 0 && value < end) {
                        break;
                    }
                    self.assign_name(&iterator, Value::Integer(value));
                    self.declare_type(&iterator, "INTEGER");
                    if let flow @ Flow::Return(_) =
                        self.exec_block(array_field(statement, "body"))?
                    {
                        return Ok(flow);
                    }
                    value += step;
                }
                Ok(Flow::Continue)
            }
            "while" => {
                while self.eval(required(statement, "condition")?)?.truthy() {
                    if let flow @ Flow::Return(_) =
                        self.exec_block(array_field(statement, "body"))?
                    {
                        return Ok(flow);
                    }
                }
                Ok(Flow::Continue)
            }
            "repeat" => {
                loop {
                    if let flow @ Flow::Return(_) =
                        self.exec_block(array_field(statement, "body"))?
                    {
                        return Ok(flow);
                    }
                    if self.eval(required(statement, "condition")?)?.truthy() {
                        break;
                    }
                }
                Ok(Flow::Continue)
            }
            "callStatement" => {
                self.call_routine(
                    &str_field(statement, "name"),
                    array_field(statement, "args"),
                    statement,
                )?;
                Ok(Flow::Continue)
            }
            "return" => Ok(Flow::Return(self.eval(required(statement, "value")?)?)),
            "openfile" => {
                let name = self.eval(required(statement, "fileIdentifier")?)?.display();
                let mode = str_field(statement, "mode");
                if mode == "WRITE" {
                    self.virtual_files.insert(name.clone(), Vec::new());
                } else {
                    self.virtual_files.entry(name.clone()).or_default();
                }
                self.open_files
                    .insert(name, FileHandle { mode, pointer: 0 });
                Ok(Flow::Continue)
            }
            "readfile" => {
                let name = self.eval(required(statement, "fileIdentifier")?)?.display();
                let line = self.read_file(&name, statement)?;
                self.assign_target(required(statement, "target")?, Value::String(line))?;
                Ok(Flow::Continue)
            }
            "writefile" => {
                let name = self.eval(required(statement, "fileIdentifier")?)?.display();
                let value = self.eval(required(statement, "value")?)?.display();
                self.write_file(&name, value, statement)?;
                Ok(Flow::Continue)
            }
            "closefile" => {
                let name = self.eval(required(statement, "fileIdentifier")?)?.display();
                self.open_files.remove(&name);
                Ok(Flow::Continue)
            }
            _ => Ok(Flow::Continue),
        }
    }

    fn eval(&mut self, expression: &JsonValue) -> RuntimeResult<Value> {
        self.step(expression)?;
        match str_field(expression, "kind").as_str() {
            "literal" => Ok(match str_field(expression, "literalType").as_str() {
                "INTEGER" => Value::Integer(
                    expression
                        .get("value")
                        .and_then(JsonValue::as_i64)
                        .unwrap_or(0),
                ),
                "REAL" => Value::Real(
                    expression
                        .get("value")
                        .and_then(JsonValue::as_f64)
                        .unwrap_or(0.0),
                ),
                "BOOLEAN" => Value::Boolean(
                    expression
                        .get("value")
                        .and_then(JsonValue::as_bool)
                        .unwrap_or(false),
                ),
                _ => Value::String(
                    expression
                        .get("value")
                        .and_then(JsonValue::as_str)
                        .unwrap_or("")
                        .to_string(),
                ),
            }),
            "identifier" => self.lookup(&str_field(expression, "name")).ok_or_else(|| {
                RuntimeError::at(
                    expression,
                    format!(
                        "Undeclared identifier \"{}\".",
                        str_field(expression, "name")
                    ),
                )
            }),
            "arrayAccess" => self.read_array(expression),
            "unary" => {
                let operand = self.eval(required(expression, "operand")?)?;
                if str_field(expression, "operator") == "NOT" {
                    Ok(Value::Boolean(!operand.truthy()))
                } else {
                    match operand {
                        Value::Real(value) => Ok(Value::Real(-value)),
                        value => Ok(Value::Integer(-value.to_i64())),
                    }
                }
            }
            "binary" => self.eval_binary(expression),
            "call" => self.call_function(
                &str_field(expression, "name"),
                array_field(expression, "args"),
                expression,
            ),
            _ => Ok(Value::Null),
        }
    }

    fn eval_binary(&mut self, expression: &JsonValue) -> RuntimeResult<Value> {
        let left = self.eval(required(expression, "left")?)?;
        let op = str_field(expression, "operator");
        if op == "AND" {
            return Ok(Value::Boolean(
                left.truthy() && self.eval(required(expression, "right")?)?.truthy(),
            ));
        }
        if op == "OR" {
            return Ok(Value::Boolean(
                left.truthy() || self.eval(required(expression, "right")?)?.truthy(),
            ));
        }
        let right = self.eval(required(expression, "right")?)?;
        Ok(match op.as_str() {
            "+" => numeric_result(&left, &right, left.to_f64() + right.to_f64(), false),
            "-" => numeric_result(&left, &right, left.to_f64() - right.to_f64(), false),
            "*" => numeric_result(&left, &right, left.to_f64() * right.to_f64(), false),
            "/" => {
                if right.to_f64() == 0.0 {
                    return Err(RuntimeError::at(expression, "Division by zero"));
                }
                Value::Real(left.to_f64() / right.to_f64())
            }
            "^" => numeric_result(&left, &right, left.to_f64().powf(right.to_f64()), true),
            "=" => Value::Boolean(values_equal(&left, &right)),
            "<>" => Value::Boolean(!values_equal(&left, &right)),
            "<" => Value::Boolean(compare_values(&left, &right, |a, b| a < b)),
            "<=" => Value::Boolean(compare_values(&left, &right, |a, b| a <= b)),
            ">" => Value::Boolean(compare_values(&left, &right, |a, b| a > b)),
            ">=" => Value::Boolean(compare_values(&left, &right, |a, b| a >= b)),
            _ => Value::Null,
        })
    }

    fn call_function(
        &mut self,
        name: &str,
        args: &[JsonValue],
        source: &JsonValue,
    ) -> RuntimeResult<Value> {
        let upper = name.to_uppercase();
        match upper.as_str() {
            "DIV" => {
                let left = self.eval(&args[0])?.to_i64();
                let right = self.eval(&args[1])?.to_i64();
                if right == 0 {
                    return Err(RuntimeError::at(source, "Division by zero"));
                }
                return Ok(Value::Integer(left.div_euclid(right)));
            }
            "MOD" => {
                let left = self.eval(&args[0])?.to_i64();
                let right = self.eval(&args[1])?.to_i64();
                if right == 0 {
                    return Err(RuntimeError::at(source, "Modulo by zero"));
                }
                return Ok(Value::Integer(left.rem_euclid(right)));
            }
            "LENGTH" => {
                return Ok(Value::Integer(
                    self.eval(&args[0])?.display().chars().count() as i64,
                ))
            }
            "LCASE" => return Ok(Value::String(self.eval(&args[0])?.display().to_lowercase())),
            "UCASE" => return Ok(Value::String(self.eval(&args[0])?.display().to_uppercase())),
            "SUBSTRING" => {
                let text = self.eval(&args[0])?.display();
                let start = self.eval(&args[1])?.to_i64().max(1) as usize - 1;
                let length = self.eval(&args[2])?.to_i64().max(0) as usize;
                return Ok(Value::String(
                    text.chars().skip(start).take(length).collect(),
                ));
            }
            "ROUND" => {
                let value = self.eval(&args[0])?.to_f64();
                let places = self.eval(&args[1])?.to_i64();
                let factor = 10_f64.powi(places as i32);
                return Ok(Value::Real((value * factor).round() / factor));
            }
            "RANDOM" => {
                self.rng_state = self
                    .rng_state
                    .wrapping_mul(6364136223846793005)
                    .wrapping_add(1);
                let value = ((self.rng_state >> 11) as f64) / ((1_u64 << 53) as f64);
                return Ok(Value::Real(value));
            }
            _ => {}
        }

        let Some(function) = self.functions.get(&name.to_lowercase()).cloned() else {
            return Err(RuntimeError::at(
                source,
                format!("Unknown function \"{name}\"."),
            ));
        };
        let flow = self.call_user_routine(&function, args, source)?;
        Ok(match flow {
            Flow::Return(value) => value,
            Flow::Continue => Value::Null,
        })
    }

    fn call_routine(
        &mut self,
        name: &str,
        args: &[JsonValue],
        source: &JsonValue,
    ) -> RuntimeResult<Flow> {
        let Some(procedure) = self.procedures.get(&name.to_lowercase()).cloned() else {
            return Err(RuntimeError::at(
                source,
                format!("Unknown procedure \"{name}\"."),
            ));
        };
        self.call_user_routine(&procedure, args, source)
    }

    fn call_user_routine(
        &mut self,
        routine: &JsonValue,
        args: &[JsonValue],
        source: &JsonValue,
    ) -> RuntimeResult<Flow> {
        let params = array_field(routine, "params");
        if params.len() != args.len() {
            return Err(RuntimeError::at(source, "Routine argument count mismatch"));
        }

        let mut scope = HashMap::new();
        let mut type_scope = HashMap::new();
        for (param, arg) in params.iter().zip(args.iter()) {
            let name = str_field(param, "name").to_lowercase();
            let type_name = nested_str(param, &["typeNode", "name"]);
            scope.insert(name.clone(), self.eval(arg)?);
            if !type_name.is_empty() {
                type_scope.insert(name, type_name);
            }
        }
        self.scopes.push(scope);
        self.type_scopes.push(type_scope);
        let flow = self.exec_block(array_field(routine, "body"));
        self.type_scopes.pop();
        self.scopes.pop();
        flow
    }

    fn assign_target(&mut self, target: &JsonValue, value: Value) -> RuntimeResult<()> {
        match str_field(target, "kind").as_str() {
            "identifier" => {
                self.assign_name(&str_field(target, "name"), value);
                Ok(())
            }
            "arrayAccess" => self.write_array(target, value),
            _ => Err(RuntimeError::at(target, "Invalid assignment target")),
        }
    }

    fn assign_name(&mut self, name: &str, value: Value) {
        let key = name.to_lowercase();
        for scope in self.scopes.iter_mut().rev() {
            if scope.contains_key(&key) {
                scope.insert(key, value);
                return;
            }
        }
        self.scopes
            .last_mut()
            .expect("scope exists")
            .insert(key, value);
    }

    fn lookup(&self, name: &str) -> Option<Value> {
        let key = name.to_lowercase();
        for scope in self.scopes.iter().rev() {
            if let Some(value) = scope.get(&key) {
                return Some(value.clone());
            }
        }
        None
    }

    fn declare_type(&mut self, name: &str, type_name: &str) {
        self.type_scopes
            .last_mut()
            .expect("type scope exists")
            .insert(name.to_lowercase(), type_name.to_string());
    }

    fn lookup_type(&self, name: &str) -> Option<String> {
        let key = name.to_lowercase();
        for scope in self.type_scopes.iter().rev() {
            if let Some(type_name) = scope.get(&key) {
                return Some(type_name.clone());
            }
        }
        None
    }

    fn read_array(&mut self, target: &JsonValue) -> RuntimeResult<Value> {
        let name = str_field(target, "name");
        let indices = self.indices(target)?;
        match self.lookup(&name) {
            Some(Value::Array(array)) => array
                .get(&indices)
                .ok_or_else(|| RuntimeError::at(target, "Index out of declared range")),
            _ => Err(RuntimeError::at(
                target,
                format!("\"{name}\" is not an array"),
            )),
        }
    }

    fn write_array(&mut self, target: &JsonValue, value: Value) -> RuntimeResult<()> {
        let name = str_field(target, "name");
        let key = name.to_lowercase();
        let indices = self.indices(target)?;
        for scope in self.scopes.iter_mut().rev() {
            if let Some(Value::Array(array)) = scope.get_mut(&key) {
                return array
                    .set(indices, value)
                    .map_err(|message| RuntimeError::at(target, message));
            }
        }
        Err(RuntimeError::at(
            target,
            format!("\"{name}\" is not an array"),
        ))
    }

    fn indices(&mut self, target: &JsonValue) -> RuntimeResult<Vec<i64>> {
        array_field(target, "indices")
            .iter()
            .map(|expr| Ok(self.eval(expr)?.to_i64()))
            .collect()
    }

    fn read_input(&mut self, source: &JsonValue) -> RuntimeResult<String> {
        if self.stdin_cursor >= self.stdin_lines.len() {
            return Err(RuntimeError::at(
                source,
                "INPUT requested but no stdin lines remain",
            ));
        }
        let value = self.stdin_lines[self.stdin_cursor].clone();
        self.stdin_cursor += 1;
        Ok(value)
    }

    fn target_type(&self, statement: &JsonValue) -> Option<String> {
        let target = statement.get("target")?;
        if str_field(target, "kind") == "identifier" {
            self.lookup_type(&str_field(target, "name"))
        } else if str_field(target, "kind") == "arrayAccess" {
            self.lookup_type(&str_field(target, "name"))
        } else {
            None
        }
    }

    fn read_file(&mut self, name: &str, source: &JsonValue) -> RuntimeResult<String> {
        let handle = self
            .open_files
            .get_mut(name)
            .ok_or_else(|| RuntimeError::at(source, format!("File {name} is not open")))?;
        if handle.mode != "READ" {
            return Err(RuntimeError::at(
                source,
                format!("File {name} not opened in READ mode"),
            ));
        }
        let data = self.virtual_files.get(name).cloned().unwrap_or_default();
        if handle.pointer >= data.len() {
            return Ok(String::new());
        }
        let line = data[handle.pointer].clone();
        handle.pointer += 1;
        Ok(line)
    }

    fn write_file(&mut self, name: &str, value: String, source: &JsonValue) -> RuntimeResult<()> {
        let handle = self
            .open_files
            .get(name)
            .ok_or_else(|| RuntimeError::at(source, format!("File {name} is not open")))?;
        if handle.mode != "WRITE" {
            return Err(RuntimeError::at(
                source,
                format!("File {name} not opened in WRITE mode"),
            ));
        }
        self.virtual_files
            .entry(name.to_string())
            .or_default()
            .push(value);
        Ok(())
    }

    fn step(&mut self, source: &JsonValue) -> RuntimeResult<()> {
        if self.remaining_steps == 0 {
            return Err(RuntimeError::at(source, "Instruction budget exceeded."));
        }
        self.remaining_steps -= 1;
        Ok(())
    }
}

impl PseudoArray {
    fn norm(&self, indices: &[i64]) -> Result<Vec<i64>, String> {
        if indices.len() != self.bounds.len() {
            return Err("Incorrect index dimensions".to_string());
        }
        for (value, (lower, upper)) in indices.iter().zip(self.bounds.iter()) {
            if value < lower || value > upper {
                return Err("Index out of declared range".to_string());
            }
        }
        Ok(indices.to_vec())
    }

    fn get(&self, indices: &[i64]) -> Option<Value> {
        let key = self.norm(indices).ok()?;
        Some(
            self.store
                .get(&key)
                .cloned()
                .unwrap_or_else(|| (*self.default).clone()),
        )
    }

    fn set(&mut self, indices: Vec<i64>, value: Value) -> Result<(), String> {
        let key = self.norm(&indices)?;
        self.store.insert(key, value);
        Ok(())
    }
}

impl Value {
    fn display(&self) -> String {
        match self {
            Value::Integer(value) => value.to_string(),
            Value::Real(value) => {
                let text = value.to_string();
                if text == "-0" {
                    "0".to_string()
                } else {
                    text
                }
            }
            Value::String(value) => value.clone(),
            Value::Boolean(value) => {
                if *value {
                    "True".to_string()
                } else {
                    "False".to_string()
                }
            }
            Value::Array(_) => "[array]".to_string(),
            Value::Null => "None".to_string(),
        }
    }

    fn truthy(&self) -> bool {
        match self {
            Value::Boolean(value) => *value,
            Value::Integer(value) => *value != 0,
            Value::Real(value) => *value != 0.0,
            Value::String(value) => !value.is_empty(),
            Value::Array(_) => true,
            Value::Null => false,
        }
    }

    fn to_i64(&self) -> i64 {
        match self {
            Value::Integer(value) => *value,
            Value::Real(value) => *value as i64,
            Value::Boolean(value) => i64::from(*value),
            Value::String(value) => value.trim().parse::<i64>().unwrap_or(0),
            _ => 0,
        }
    }

    fn to_f64(&self) -> f64 {
        match self {
            Value::Integer(value) => *value as f64,
            Value::Real(value) => *value,
            Value::Boolean(value) => {
                if *value {
                    1.0
                } else {
                    0.0
                }
            }
            Value::String(value) => value.trim().parse::<f64>().unwrap_or(0.0),
            _ => 0.0,
        }
    }

    fn type_name(&self) -> String {
        match self {
            Value::Integer(_) => "INTEGER",
            Value::Real(_) => "REAL",
            Value::String(value) if value.chars().count() <= 1 => "CHAR",
            Value::String(_) => "STRING",
            Value::Boolean(_) => "BOOLEAN",
            Value::Array(array) => return array.default.type_name(),
            Value::Null => "STRING",
        }
        .to_string()
    }
}

impl RuntimeError {
    fn new(message: impl Into<String>, line: usize, column: usize) -> Self {
        Self {
            message: message.into(),
            line,
            column,
        }
    }

    fn at(source: &JsonValue, message: impl Into<String>) -> Self {
        let span = source.get("span").unwrap_or(&JsonValue::Null);
        Self::new(
            message,
            span.get("startLine")
                .and_then(JsonValue::as_u64)
                .unwrap_or(1) as usize,
            span.get("startColumn")
                .and_then(JsonValue::as_u64)
                .unwrap_or(1) as usize,
        )
    }
}

fn default_value(type_name: &str) -> Value {
    match type_name {
        "INTEGER" => Value::Integer(0),
        "REAL" => Value::Real(0.0),
        "BOOLEAN" => Value::Boolean(false),
        _ => Value::String(String::new()),
    }
}

fn coerce_input(value: &str, type_name: &str) -> Value {
    match type_name {
        "INTEGER" => Value::Integer(value.trim().parse().unwrap_or(0)),
        "REAL" => Value::Real(value.trim().parse().unwrap_or(0.0)),
        "BOOLEAN" => Value::Boolean(value.trim().eq_ignore_ascii_case("TRUE")),
        "CHAR" => Value::String(
            value
                .chars()
                .next()
                .map(|char| char.to_string())
                .unwrap_or_default(),
        ),
        _ => Value::String(value.to_string()),
    }
}

fn numeric_result(
    left: &Value,
    right: &Value,
    value: f64,
    force_real_for_fractional: bool,
) -> Value {
    if !force_real_for_fractional
        && matches!(left, Value::Integer(_))
        && matches!(right, Value::Integer(_))
        && value.fract() == 0.0
    {
        Value::Integer(value as i64)
    } else {
        Value::Real(value)
    }
}

fn values_equal(left: &Value, right: &Value) -> bool {
    match (left, right) {
        (Value::String(a), Value::String(b)) => a == b,
        (Value::Boolean(a), Value::Boolean(b)) => a == b,
        (Value::Integer(a), Value::Integer(b)) => a == b,
        (Value::Real(a), Value::Real(b)) => (a - b).abs() < f64::EPSILON,
        (Value::Integer(_), Value::Real(_)) | (Value::Real(_), Value::Integer(_)) => {
            (left.to_f64() - right.to_f64()).abs() < f64::EPSILON
        }
        _ => left.display() == right.display(),
    }
}

fn compare_values(left: &Value, right: &Value, compare: impl Fn(f64, f64) -> bool) -> bool {
    match (left, right) {
        (Value::String(a), Value::String(b)) => compare_order(a, b, compare),
        _ => compare(left.to_f64(), right.to_f64()),
    }
}

fn compare_order(left: &str, right: &str, compare: impl Fn(f64, f64) -> bool) -> bool {
    let ordering = if left < right {
        -1.0
    } else if left > right {
        1.0
    } else {
        0.0
    };
    compare(ordering, 0.0)
}

fn required<'a>(value: &'a JsonValue, key: &str) -> RuntimeResult<&'a JsonValue> {
    value
        .get(key)
        .ok_or_else(|| RuntimeError::at(value, format!("Missing AST field \"{key}\"")))
}

fn str_field(value: &JsonValue, key: &str) -> String {
    value
        .get(key)
        .and_then(JsonValue::as_str)
        .unwrap_or("")
        .to_string()
}

fn nested_str(value: &JsonValue, path: &[&str]) -> String {
    let mut current = value;
    for key in path {
        current = current.get(*key).unwrap_or(&JsonValue::Null);
    }
    current.as_str().unwrap_or("").to_string()
}

fn int_field(value: &JsonValue, key: &str) -> i64 {
    value.get(key).and_then(JsonValue::as_i64).unwrap_or(0)
}

fn array_field<'a>(value: &'a JsonValue, key: &str) -> &'a [JsonValue] {
    value
        .get(key)
        .and_then(JsonValue::as_array)
        .map(Vec::as_slice)
        .unwrap_or(&[])
}

pub fn run_ast_json(
    ast_json: &str,
    stdin_lines: Vec<String>,
    virtual_files: HashMap<String, Vec<String>>,
    instruction_budget: Option<usize>,
) -> RunResult {
    let input = RunInput {
        ast_json: ast_json.to_string(),
        stdin_lines,
        virtual_files,
        instruction_budget,
    };
    match Runtime::new(input) {
        Ok(runtime) => runtime.run(),
        Err(error) => RunResult {
            success: false,
            stdout: String::new(),
            stderr: error.message.clone(),
            diagnostics: vec![Diagnostic {
                code: "RUN500".to_string(),
                message: error.message,
                severity: "error".to_string(),
                line: error.line,
                column: error.column,
                end_line: error.line,
                end_column: error.column,
                hint: None,
            }],
            virtual_files: HashMap::new(),
        },
    }
}

#[wasm_bindgen]
pub fn run_pseudocode(request_json: &str) -> String {
    let result = match serde_json::from_str::<RunInput>(request_json) {
        Ok(input) => match Runtime::new(input) {
            Ok(runtime) => runtime.run(),
            Err(error) => RunResult {
                success: false,
                stdout: String::new(),
                stderr: error.message.clone(),
                diagnostics: vec![Diagnostic {
                    code: "RUN500".to_string(),
                    message: error.message,
                    severity: "error".to_string(),
                    line: error.line,
                    column: error.column,
                    end_line: error.line,
                    end_column: error.column,
                    hint: None,
                }],
                virtual_files: HashMap::new(),
            },
        },
        Err(error) => RunResult {
            success: false,
            stdout: String::new(),
            stderr: format!("Invalid runtime request: {error}"),
            diagnostics: vec![Diagnostic {
                code: "RUN500".to_string(),
                message: format!("Invalid runtime request: {error}"),
                severity: "error".to_string(),
                line: 1,
                column: 1,
                end_line: 1,
                end_column: 1,
                hint: None,
            }],
            virtual_files: HashMap::new(),
        },
    };
    serde_json::to_string(&result).unwrap_or_else(|error| {
        json!({
            "success": false,
            "stdout": "",
            "stderr": format!("Failed to serialize runtime result: {error}"),
            "diagnostics": [],
            "virtualFiles": {}
        })
        .to_string()
    })
}

#[wasm_bindgen]
pub fn runtime_ready() -> bool {
    true
}

#[allow(dead_code)]
fn object_from_pairs(pairs: Vec<(&str, JsonValue)>) -> JsonValue {
    JsonValue::Object(Map::from_iter(
        pairs
            .into_iter()
            .map(|(key, value)| (key.to_string(), value)),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    fn span() -> JsonValue {
        json!({"startLine": 1, "startColumn": 1, "endLine": 1, "endColumn": 1})
    }

    fn program(body: Vec<JsonValue>) -> String {
        json!({"kind": "program", "body": body, "span": span()}).to_string()
    }

    fn ident(name: &str) -> JsonValue {
        json!({"kind": "identifier", "name": name, "span": span()})
    }

    fn int(value: i64) -> JsonValue {
        json!({"kind": "literal", "value": value, "literalType": "INTEGER", "span": span()})
    }

    fn string(value: &str) -> JsonValue {
        json!({"kind": "literal", "value": value, "literalType": "STRING", "span": span()})
    }

    fn declare(name: &str, type_name: &str) -> JsonValue {
        json!({"kind":"declare","identifier":ident(name),"typeNode":{"kind":"basic","name":type_name,"span":span()},"span":span()})
    }

    fn run(ast_json: String) -> RunResult {
        run_ast_json(&ast_json, Vec::new(), HashMap::new(), Some(10_000))
    }

    #[test]
    fn executes_arithmetic_and_loops() {
        let ast = program(vec![
            declare("Total", "INTEGER"),
            json!({"kind":"for","iterator":ident("Index"),"startValue":int(1),"endValue":int(3),"stepValue":JsonValue::Null,"body":[
                {"kind":"assignment","target":ident("Total"),"value":{"kind":"binary","operator":"+","left":ident("Total"),"right":ident("Index"),"span":span()},"span":span()}
            ],"span":span()}),
            json!({"kind":"output","values":[ident("Total")],"span":span()}),
        ]);
        let result = run(ast);
        assert!(result.success, "{}", result.stderr);
        assert_eq!(result.stdout, "6");
    }

    #[test]
    fn supports_arrays() {
        let ast = program(vec![
            json!({"kind":"declare","identifier":ident("A"),"typeNode":{"kind":"array","elementType":"INTEGER","dimensions":[{"lower":1,"upper":2}],"span":span()},"span":span()}),
            json!({"kind":"assignment","target":{"kind":"arrayAccess","name":"A","indices":[int(2)],"span":span()},"value":int(9),"span":span()}),
            json!({"kind":"output","values":[{"kind":"arrayAccess","name":"A","indices":[int(2)],"span":span()}],"span":span()}),
        ]);
        let result = run(ast);
        assert!(result.success, "{}", result.stderr);
        assert_eq!(result.stdout, "9");
    }

    #[test]
    fn supports_functions() {
        let ast = program(vec![
            json!({"kind":"functionDefinition","name":"AddOne","params":[{"name":"X","typeNode":{"kind":"basic","name":"INTEGER","span":span()},"span":span()}],"returnType":"INTEGER","body":[
                {"kind":"return","value":{"kind":"binary","operator":"+","left":ident("X"),"right":int(1),"span":span()},"span":span()}
            ],"span":span()}),
            json!({"kind":"output","values":[{"kind":"call","name":"AddOne","args":[int(4)],"span":span()}],"span":span()}),
        ]);
        let result = run(ast);
        assert!(result.success, "{}", result.stderr);
        assert_eq!(result.stdout, "5");
    }

    #[test]
    fn supports_file_io() {
        let ast = program(vec![
            json!({"kind":"openfile","fileIdentifier":string("A.txt"),"mode":"WRITE","span":span()}),
            json!({"kind":"writefile","fileIdentifier":string("A.txt"),"value":string("hello"),"span":span()}),
            json!({"kind":"closefile","fileIdentifier":string("A.txt"),"span":span()}),
        ]);
        let result = run(ast);
        assert!(result.success, "{}", result.stderr);
        assert_eq!(
            result.virtual_files.get("A.txt"),
            Some(&vec!["hello".to_string()])
        );
    }

    #[test]
    fn stops_infinite_loops_with_budget() {
        let ast = program(vec![
            json!({"kind":"while","condition":{"kind":"literal","value":true,"literalType":"BOOLEAN","span":span()},"body":[],"span":span()}),
        ]);
        let result = run_ast_json(&ast, Vec::new(), HashMap::new(), Some(10));
        assert!(!result.success);
        assert_eq!(result.diagnostics[0].code, "RUN408");
    }
}
