use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value as JsonValue};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

const DEFAULT_INSTRUCTION_BUDGET: usize = 1_000_000;
const DEFAULT_SEED: u64 = 0x9e37_79b9_7f4a_7c15;
/// Deepest chain of active routine calls.
const MAX_CALL_DEPTH: usize = 250;
/// Deepest recursion through statements and expressions, counted across calls.
/// Keeps the WASM stack from overflowing.
const MAX_NESTING_DEPTH: usize = 4_000;
/// Deepest JSON nesting accepted for the AST, checked before parsing.
const MAX_AST_JSON_DEPTH: usize = 4_000;

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
    seed: Option<u64>,
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
    depth: usize,
    rng_state: u64,
}

impl Runtime {
    fn new(input: RunInput) -> RuntimeResult<Self> {
        if json_depth_exceeds(&input.ast_json, MAX_AST_JSON_DEPTH) {
            return Err(RuntimeError::new(
                format!("Program nesting is too deep (limit {MAX_AST_JSON_DEPTH} levels)"),
                1,
                1,
            ));
        }
        let mut deserializer = serde_json::Deserializer::from_str(&input.ast_json);
        deserializer.disable_recursion_limit();
        let ast = JsonValue::deserialize(&mut deserializer)
            .and_then(|ast| deserializer.end().map(|_| ast))
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
            depth: 0,
            rng_state: input.seed.unwrap_or(DEFAULT_SEED),
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
        self.enter(statement)?;
        let flow = self.exec_statement_inner(statement);
        self.depth -= 1;
        flow
    }

    fn exec_statement_inner(&mut self, statement: &JsonValue) -> RuntimeResult<Flow> {
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
                self.declare_name(&name, value);
                Ok(Flow::Continue)
            }
            "constant" => {
                let name = nested_str(statement, &["identifier", "name"]);
                let value = self.eval(required(statement, "value")?)?;
                self.declare_type(&name, &value.type_name());
                self.declare_name(&name, value);
                Ok(Flow::Continue)
            }
            "assignment" => {
                let value = self.eval(required(statement, "value")?)?;
                let value =
                    coerce_declared(&self.target_type(statement).unwrap_or_default(), value);
                self.assign_target(required(statement, "target")?, value)?;
                Ok(Flow::Continue)
            }
            "input" => {
                let raw = self.read_input(statement)?;
                let target = required(statement, "target")?;
                let value = match self.target_type(statement) {
                    Some(type_name) => coerce_input(&raw, &type_name)
                        .map_err(|message| RuntimeError::at(statement, message))?,
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
                let end = self.eval_integer(required(statement, "endValue")?, "FOR end value")?;
                let step = match statement.get("stepValue") {
                    Some(JsonValue::Null) | None => 1,
                    Some(expr) => self.eval_integer(expr, "FOR STEP")?,
                };
                if step == 0 {
                    return Err(RuntimeError::at(statement, "FOR STEP cannot be zero"));
                }
                let mut value =
                    self.eval_integer(required(statement, "startValue")?, "FOR start value")?;
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
                    match value.checked_add(step) {
                        Some(next) => value = next,
                        None => break,
                    }
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
                match mode.as_str() {
                    "WRITE" => {
                        self.virtual_files.insert(name.clone(), Vec::new());
                    }
                    "READ" if !self.virtual_files.contains_key(&name) => {
                        return Err(RuntimeError::at(
                            statement,
                            format!("File {name} does not exist"),
                        ));
                    }
                    _ => {
                        self.virtual_files.entry(name.clone()).or_default();
                    }
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
        self.enter(expression)?;
        let value = self.eval_inner(expression);
        self.depth -= 1;
        value
    }

    fn eval_inner(&mut self, expression: &JsonValue) -> RuntimeResult<Value> {
        match str_field(expression, "kind").as_str() {
            "literal" => Ok(match str_field(expression, "literalType").as_str() {
                "INTEGER" => Value::Integer(
                    expression
                        .get("value")
                        .and_then(JsonValue::as_i64)
                        .ok_or_else(|| {
                            RuntimeError::at(expression, "Integer literal is out of range")
                        })?,
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
                        value => integer_result(expression, value.to_i64().checked_neg()),
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
        if let (Value::Integer(a), Value::Integer(b)) = (&left, &right) {
            match op.as_str() {
                "+" => return integer_result(expression, a.checked_add(*b)),
                "-" => return integer_result(expression, a.checked_sub(*b)),
                "*" => return integer_result(expression, a.checked_mul(*b)),
                _ => {}
            }
        }
        let (a, b) = (left.to_f64(), right.to_f64());
        Ok(match op.as_str() {
            "+" => real_result(expression, a + b)?,
            "-" => real_result(expression, a - b)?,
            "*" => real_result(expression, a * b)?,
            "/" => {
                if b == 0.0 {
                    return Err(RuntimeError::at(expression, "Division by zero"));
                }
                real_result(expression, a / b)?
            }
            "^" => real_result(expression, a.powf(b))?,
            "=" => Value::Boolean(values_equal(&left, &right)),
            "<>" => Value::Boolean(!values_equal(&left, &right)),
            "<" => Value::Boolean(compare_values(&left, &right, |a, b| a < b)),
            "<=" => Value::Boolean(compare_values(&left, &right, |a, b| a <= b)),
            ">" => Value::Boolean(compare_values(&left, &right, |a, b| a > b)),
            ">=" => Value::Boolean(compare_values(&left, &right, |a, b| a >= b)),
            _ => Value::Null,
        })
    }

    fn eval_integer(&mut self, expression: &JsonValue, what: &str) -> RuntimeResult<i64> {
        match self.eval(expression)? {
            Value::Integer(value) => Ok(value),
            Value::Real(value) if whole_number(value).is_some() => Ok(value as i64),
            value => Err(RuntimeError::at(
                expression,
                format!("{what} must be an INTEGER, got {}", value.display()),
            )),
        }
    }

    fn call_function(
        &mut self,
        name: &str,
        args: &[JsonValue],
        source: &JsonValue,
    ) -> RuntimeResult<Value> {
        let upper = name.to_uppercase();
        match upper.as_str() {
            "DIV" | "MOD" => {
                let left = self.eval(arg(args, 0, source)?)?.to_i64();
                let right = self.eval(arg(args, 1, source)?)?.to_i64();
                if right == 0 {
                    let message = if upper == "DIV" {
                        "Division by zero"
                    } else {
                        "Modulo by zero"
                    };
                    return Err(RuntimeError::at(source, message));
                }
                // Both truncate toward zero: DIV(-7, 2) = -3 and MOD(-7, 2) = -1.
                let result = if upper == "DIV" {
                    left.checked_div(right)
                } else {
                    left.checked_rem(right)
                };
                return integer_result(source, result);
            }
            "LENGTH" => {
                return Ok(Value::Integer(
                    self.eval(arg(args, 0, source)?)?.display().chars().count() as i64,
                ))
            }
            "LCASE" => {
                return Ok(Value::String(
                    self.eval(arg(args, 0, source)?)?.display().to_lowercase(),
                ))
            }
            "UCASE" => {
                return Ok(Value::String(
                    self.eval(arg(args, 0, source)?)?.display().to_uppercase(),
                ))
            }
            "SUBSTRING" => {
                let text = self.eval(arg(args, 0, source)?)?.display();
                let start = self.eval(arg(args, 1, source)?)?.to_i64().max(1) as usize - 1;
                let length = self.eval(arg(args, 2, source)?)?.to_i64().max(0) as usize;
                return Ok(Value::String(
                    text.chars().skip(start).take(length).collect(),
                ));
            }
            "ROUND" => {
                let value = self.eval(arg(args, 0, source)?)?.to_f64();
                let places = self.eval(arg(args, 1, source)?)?.to_i64().clamp(-308, 308);
                let factor = 10_f64.powi(places as i32);
                let scaled = value * factor;
                let rounded = if scaled.is_finite() {
                    scaled.round() / factor
                } else {
                    value
                };
                return real_result(source, rounded);
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
            Flow::Return(value) => coerce_declared(&str_field(&function, "returnType"), value),
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
        // scopes holds the global scope plus one scope per active call.
        if self.scopes.len() > MAX_CALL_DEPTH {
            return Err(RuntimeError::at(
                source,
                format!("Recursion too deep (limit {MAX_CALL_DEPTH} calls)"),
            ));
        }

        let mut scope = HashMap::new();
        let mut type_scope = HashMap::new();
        for (param, arg) in params.iter().zip(args.iter()) {
            let name = str_field(param, "name").to_lowercase();
            let type_name = nested_str(param, &["typeNode", "name"]);
            scope.insert(name.clone(), coerce_declared(&type_name, self.eval(arg)?));
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

    /// One scope per routine: a name resolves to the current routine's scope, then the global one.
    fn visible_scopes(&self) -> [usize; 2] {
        [self.scopes.len() - 1, 0]
    }

    fn assign_name(&mut self, name: &str, value: Value) {
        let key = name.to_lowercase();
        let index = self
            .visible_scopes()
            .into_iter()
            .find(|&index| self.scopes[index].contains_key(&key))
            .unwrap_or(self.scopes.len() - 1);
        self.scopes[index].insert(key, value);
    }

    fn declare_name(&mut self, name: &str, value: Value) {
        self.scopes
            .last_mut()
            .expect("scope exists")
            .insert(name.to_lowercase(), value);
    }

    fn lookup(&self, name: &str) -> Option<Value> {
        let key = name.to_lowercase();
        self.visible_scopes()
            .into_iter()
            .find_map(|index| self.scopes[index].get(&key).cloned())
    }

    fn declare_type(&mut self, name: &str, type_name: &str) {
        self.type_scopes
            .last_mut()
            .expect("type scope exists")
            .insert(name.to_lowercase(), type_name.to_string());
    }

    fn lookup_type(&self, name: &str) -> Option<String> {
        let key = name.to_lowercase();
        self.visible_scopes()
            .into_iter()
            .find_map(|index| self.type_scopes[index].get(&key).cloned())
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
        for index in self.visible_scopes() {
            if let Some(Value::Array(array)) = self.scopes[index].get_mut(&key) {
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
        match str_field(target, "kind").as_str() {
            "identifier" | "arrayAccess" => self.lookup_type(&str_field(target, "name")),
            _ => None,
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

    /// Counts one instruction and one nesting level. Callers decrement `depth` when done.
    fn enter(&mut self, source: &JsonValue) -> RuntimeResult<()> {
        if self.remaining_steps == 0 {
            return Err(RuntimeError::at(source, "Instruction budget exceeded."));
        }
        if self.depth >= MAX_NESTING_DEPTH {
            return Err(RuntimeError::at(
                source,
                format!("Program nesting is too deep (limit {MAX_NESTING_DEPTH} levels)"),
            ));
        }
        self.remaining_steps -= 1;
        self.depth += 1;
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

fn coerce_input(value: &str, type_name: &str) -> Result<Value, String> {
    let text = value.trim();
    let invalid = || format!("Expected {type_name}, got \"{value}\"");
    Ok(match type_name {
        "INTEGER" => Value::Integer(text.parse().map_err(|_| invalid())?),
        "REAL" => match text.parse::<f64>() {
            Ok(real) if real.is_finite() => Value::Real(real),
            _ => return Err(invalid()),
        },
        "BOOLEAN" if text.eq_ignore_ascii_case("TRUE") => Value::Boolean(true),
        "BOOLEAN" if text.eq_ignore_ascii_case("FALSE") => Value::Boolean(false),
        "BOOLEAN" => return Err(invalid()),
        "CHAR" => Value::String(
            value
                .chars()
                .next()
                .map(|char| char.to_string())
                .unwrap_or_default(),
        ),
        _ => Value::String(value.to_string()),
    })
}

/// Stores a whole REAL, such as ROUND(x, 0), as an INTEGER when the destination is INTEGER.
fn coerce_declared(type_name: &str, value: Value) -> Value {
    match (type_name, value) {
        ("INTEGER", Value::Real(real)) if whole_number(real).is_some() => {
            Value::Integer(real as i64)
        }
        (_, value) => value,
    }
}

fn whole_number(value: f64) -> Option<i64> {
    (value.fract() == 0.0 && value >= i64::MIN as f64 && value < i64::MAX as f64)
        .then_some(value as i64)
}

fn integer_result(source: &JsonValue, value: Option<i64>) -> RuntimeResult<Value> {
    value
        .map(Value::Integer)
        .ok_or_else(|| RuntimeError::at(source, "Integer overflow"))
}

fn real_result(source: &JsonValue, value: f64) -> RuntimeResult<Value> {
    if value.is_finite() {
        Ok(Value::Real(value))
    } else {
        Err(RuntimeError::at(
            source,
            "REAL result is not a finite number",
        ))
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

/// Scans JSON nesting without recursion, so the parser can run with serde's depth limit disabled.
fn json_depth_exceeds(text: &str, limit: usize) -> bool {
    let (mut depth, mut in_string, mut escaped) = (0_usize, false, false);
    for byte in text.bytes() {
        if in_string {
            match byte {
                _ if escaped => escaped = false,
                b'\\' => escaped = true,
                b'"' => in_string = false,
                _ => {}
            }
        } else {
            match byte {
                b'"' => in_string = true,
                b'{' | b'[' => {
                    depth += 1;
                    if depth > limit {
                        return true;
                    }
                }
                b'}' | b']' => depth = depth.saturating_sub(1),
                _ => {}
            }
        }
    }
    false
}

fn arg<'a>(
    args: &'a [JsonValue],
    index: usize,
    source: &JsonValue,
) -> RuntimeResult<&'a JsonValue> {
    args.get(index)
        .ok_or_else(|| RuntimeError::at(source, "Routine argument count mismatch"))
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

fn internal_error(message: String, line: usize, column: usize) -> RunResult {
    RunResult {
        success: false,
        stdout: String::new(),
        stderr: message.clone(),
        diagnostics: vec![Diagnostic {
            code: "RUN500".to_string(),
            message,
            severity: "error".to_string(),
            line,
            column,
            end_line: line,
            end_column: column,
            hint: None,
        }],
        virtual_files: HashMap::new(),
    }
}

fn run_input(input: RunInput) -> RunResult {
    match Runtime::new(input) {
        Ok(runtime) => runtime.run(),
        Err(error) => internal_error(error.message, error.line, error.column),
    }
}

pub fn run_ast_json(
    ast_json: &str,
    stdin_lines: Vec<String>,
    virtual_files: HashMap<String, Vec<String>>,
    instruction_budget: Option<usize>,
) -> RunResult {
    run_input(RunInput {
        ast_json: ast_json.to_string(),
        stdin_lines,
        virtual_files,
        instruction_budget,
        seed: None,
    })
}

#[wasm_bindgen]
pub fn run_pseudocode(request_json: &str) -> String {
    let result = match serde_json::from_str::<RunInput>(request_json) {
        Ok(input) => run_input(input),
        Err(error) => internal_error(format!("Invalid runtime request: {error}"), 1, 1),
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

    fn span_at(line: usize) -> JsonValue {
        json!({"startLine": line, "startColumn": 1, "endLine": line, "endColumn": 1})
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

    fn real(value: f64) -> JsonValue {
        json!({"kind": "literal", "value": value, "literalType": "REAL", "span": span()})
    }

    fn string(value: &str) -> JsonValue {
        json!({"kind": "literal", "value": value, "literalType": "STRING", "span": span()})
    }

    fn binary(operator: &str, left: JsonValue, right: JsonValue) -> JsonValue {
        json!({"kind":"binary","operator":operator,"left":left,"right":right,"span":span()})
    }

    fn call(name: &str, args: Vec<JsonValue>) -> JsonValue {
        json!({"kind":"call","name":name,"args":args,"span":span()})
    }

    fn output(values: Vec<JsonValue>) -> JsonValue {
        json!({"kind":"output","values":values,"span":span()})
    }

    fn assign(name: &str, value: JsonValue) -> JsonValue {
        json!({"kind":"assignment","target":ident(name),"value":value,"span":span()})
    }

    fn declare(name: &str, type_name: &str) -> JsonValue {
        json!({"kind":"declare","identifier":ident(name),"typeNode":{"kind":"basic","name":type_name,"span":span()},"span":span()})
    }

    fn input(name: &str) -> JsonValue {
        json!({"kind":"input","target":ident(name),"span":span()})
    }

    fn if_then(condition: JsonValue, then_body: Vec<JsonValue>) -> JsonValue {
        json!({"kind":"if","condition":condition,"thenBody":then_body,"elseBody":[],"span":span()})
    }

    fn param(name: &str, type_name: &str) -> JsonValue {
        json!({"name":name,"typeNode":{"kind":"basic","name":type_name,"span":span()},"span":span()})
    }

    fn function(name: &str, params: Vec<JsonValue>, body: Vec<JsonValue>) -> JsonValue {
        json!({"kind":"functionDefinition","name":name,"params":params,"returnType":"INTEGER","body":body,"span":span()})
    }

    fn ret(value: JsonValue) -> JsonValue {
        json!({"kind":"return","value":value,"span":span()})
    }

    fn run(ast_json: String) -> RunResult {
        run_ast_json(&ast_json, Vec::new(), HashMap::new(), Some(10_000))
    }

    fn run_with_stdin(body: Vec<JsonValue>, stdin: &[&str]) -> RunResult {
        let stdin = stdin.iter().map(|line| line.to_string()).collect();
        run_ast_json(&program(body), stdin, HashMap::new(), Some(10_000))
    }

    fn run_output(values: Vec<JsonValue>) -> RunResult {
        run(program(vec![output(values)]))
    }

    fn assert_error(result: &RunResult, message: &str) {
        assert!(
            !result.success,
            "expected an error, got stdout {:?}",
            result.stdout
        );
        assert_eq!(result.stderr, message);
    }

    /// Debug builds use far bigger frames than release WASM, so deep tests get a large native stack.
    fn with_big_stack<T: Send + 'static>(test: impl FnOnce() -> T + Send + 'static) -> T {
        std::thread::Builder::new()
            .stack_size(512 * 1024 * 1024)
            .spawn(test)
            .unwrap()
            .join()
            .unwrap()
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

    // RT-2
    #[test]
    fn local_declare_does_not_clobber_global() {
        let result = run(program(vec![
            declare("X", "INTEGER"),
            json!({"kind":"procedureDefinition","name":"P","params":[],"body":[
                declare("X", "INTEGER"),
                assign("X", int(5)),
            ],"span":span()}),
            assign("X", int(1)),
            json!({"kind":"callStatement","name":"P","args":[],"span":span()}),
            output(vec![ident("X")]),
        ]));
        assert!(result.success, "{}", result.stderr);
        assert_eq!(result.stdout, "1");
    }

    // RT-2
    #[test]
    fn recursive_function_keeps_its_own_locals() {
        let result = run(program(vec![
            function(
                "Sum",
                vec![param("N", "INTEGER")],
                vec![
                    declare("Local", "INTEGER"),
                    assign("Local", ident("N")),
                    if_then(binary("=", ident("N"), int(0)), vec![ret(int(0))]),
                    ret(binary(
                        "+",
                        call("Sum", vec![binary("-", ident("N"), int(1))]),
                        ident("Local"),
                    )),
                ],
            ),
            output(vec![call("Sum", vec![int(3)])]),
        ]));
        assert!(result.success, "{}", result.stderr);
        assert_eq!(result.stdout, "6");
    }

    // One scope per routine: a callee sees globals, not its caller's locals.
    #[test]
    fn callee_does_not_see_caller_locals() {
        let result = run(program(vec![
            declare("X", "INTEGER"),
            assign("X", int(1)),
            json!({"kind":"procedureDefinition","name":"Show","params":[],"body":[output(vec![ident("X")])],"span":span()}),
            json!({"kind":"procedureDefinition","name":"Outer","params":[],"body":[
                declare("X", "INTEGER"),
                assign("X", int(2)),
                {"kind":"callStatement","name":"Show","args":[],"span":span()},
            ],"span":span()}),
            json!({"kind":"callStatement","name":"Outer","args":[],"span":span()}),
        ]));
        assert!(result.success, "{}", result.stderr);
        assert_eq!(result.stdout, "1");
    }

    // RT-1
    #[test]
    fn deep_recursion_raises_a_clean_error_with_the_call_line() {
        let result = with_big_stack(|| {
            let recursive_call = json!({"kind":"call","name":"R","args":[binary("+", ident("N"), int(1))],"span":span_at(3)});
            let ast = program(vec![
                function("R", vec![param("N", "INTEGER")], vec![ret(recursive_call)]),
                output(vec![call("R", vec![int(0)])]),
            ]);
            run_ast_json(&ast, Vec::new(), HashMap::new(), None)
        });
        assert_error(&result, "Recursion too deep (limit 250 calls)");
        assert_eq!(result.diagnostics[0].code, "RUN001");
        assert_eq!(result.diagnostics[0].line, 3);
    }

    // RT-3
    #[test]
    fn integer_arithmetic_is_exact_and_checked() {
        let result = run_output(vec![binary("+", int(9_007_199_254_740_992), int(1))]);
        assert_eq!(result.stdout, "9007199254740993");
        let result = run_output(vec![int(i64::MAX)]);
        assert_eq!(result.stdout, "9223372036854775807");

        for expression in [
            binary("*", int(3_037_000_500), int(3_037_000_500)),
            binary("+", int(i64::MAX), int(1)),
            binary("-", binary("-", int(0), int(i64::MAX)), int(2)),
            json!({"kind":"unary","operator":"-","operand":binary("-", binary("-", int(0), int(i64::MAX)), int(1)),"span":span()}),
        ] {
            assert_error(&run_output(vec![expression]), "Integer overflow");
        }
    }

    // RT-3
    #[test]
    fn out_of_range_integer_literal_is_an_error() {
        let literal = json!({"kind":"literal","value":9_223_372_036_854_775_808_u64,"literalType":"INTEGER","span":span()});
        assert_error(
            &run_output(vec![literal]),
            "Integer literal is out of range",
        );
    }

    // RT-6
    #[test]
    fn invalid_input_raises_an_error() {
        let cases = [
            ("INTEGER", "abc", "Expected INTEGER, got \"abc\""),
            ("INTEGER", "3.7", "Expected INTEGER, got \"3.7\""),
            ("REAL", "x", "Expected REAL, got \"x\""),
            ("REAL", "inf", "Expected REAL, got \"inf\""),
            ("BOOLEAN", "yes", "Expected BOOLEAN, got \"yes\""),
        ];
        for (type_name, text, message) in cases {
            let result = run_with_stdin(vec![declare("V", type_name), input("V")], &[text]);
            assert_error(&result, message);
        }
    }

    // RT-6
    #[test]
    fn valid_input_is_converted() {
        let body = vec![
            declare("N", "INTEGER"),
            declare("R", "REAL"),
            declare("B", "BOOLEAN"),
            declare("C", "BOOLEAN"),
            input("N"),
            input("R"),
            input("B"),
            input("C"),
            output(vec![
                ident("N"),
                string(" "),
                ident("R"),
                string(" "),
                ident("B"),
                string(" "),
                ident("C"),
            ]),
        ];
        let result = run_with_stdin(body, &[" -42 ", "2.5", "true", "FALSE"]);
        assert!(result.success, "{}", result.stderr);
        assert_eq!(result.stdout, "-42 2.5 True False");
    }

    // RT-7
    #[test]
    fn non_finite_real_results_raise_an_error() {
        assert_error(
            &run_output(vec![binary("^", real(10.0), int(400))]),
            "REAL result is not a finite number",
        );
        assert_error(
            &run_output(vec![binary("^", binary("-", int(0), int(1)), real(0.5))]),
            "REAL result is not a finite number",
        );
        assert_eq!(run_output(vec![binary("/", int(1), int(4))]).stdout, "0.25");
    }

    // RT-8
    #[test]
    fn div_and_mod_truncate_toward_zero() {
        let result = run_output(vec![
            call("DIV", vec![int(-7), int(2)]),
            string(" "),
            call("MOD", vec![int(-7), int(2)]),
            string(" "),
            call("DIV", vec![int(7), int(-2)]),
            string(" "),
            call("MOD", vec![int(7), int(-2)]),
        ]);
        assert!(result.success, "{}", result.stderr);
        assert_eq!(result.stdout, "-3 -1 -3 1");

        let min = binary("-", binary("-", int(0), int(i64::MAX)), int(1));
        assert_error(
            &run_output(vec![call("DIV", vec![min.clone(), int(-1)])]),
            "Integer overflow",
        );
        assert_error(
            &run_output(vec![call("MOD", vec![min, int(-1)])]),
            "Integer overflow",
        );
        assert_error(
            &run_output(vec![call("DIV", vec![int(1), int(0)])]),
            "Division by zero",
        );
    }

    // COMP-7 / RT-4
    #[test]
    fn deep_but_valid_programs_run() {
        let (nested_ifs, sum) = with_big_stack(|| {
            let mut statement = output(vec![int(1)]);
            for _ in 0..200 {
                statement = if_then(
                    json!({"kind":"literal","value":true,"literalType":"BOOLEAN","span":span()}),
                    vec![statement],
                );
            }
            let nested_ifs = run(program(vec![statement]));

            let mut expression = int(1);
            for _ in 1..500 {
                expression = binary("+", expression, int(1));
            }
            (nested_ifs, run(program(vec![output(vec![expression])])))
        });
        assert!(nested_ifs.success, "{}", nested_ifs.stderr);
        assert_eq!(nested_ifs.stdout, "1");
        assert!(sum.success, "{}", sum.stderr);
        assert_eq!(sum.stdout, "500");
    }

    #[test]
    fn overly_deep_json_is_rejected_before_parsing() {
        let depth = MAX_AST_JSON_DEPTH + 1;
        let ast = format!("{}{}", "[".repeat(depth), "]".repeat(depth));
        let result = run(ast);
        assert_eq!(result.diagnostics[0].code, "RUN500");
        assert_eq!(
            result.stderr,
            "Program nesting is too deep (limit 4000 levels)"
        );
        assert!(!json_depth_exceeds(r#"{"a":"[[[[\"{{"}"#, 1));
    }

    // RT-9
    #[test]
    fn fractional_for_step_is_a_clear_error() {
        let result = run(program(vec![
            declare("I", "INTEGER"),
            json!({"kind":"for","iterator":ident("I"),"startValue":int(1),"endValue":int(3),"stepValue":real(0.5),"body":[],"span":span()}),
        ]));
        assert_error(&result, "FOR STEP must be an INTEGER, got 0.5");
    }

    // RT-10
    #[test]
    fn opening_a_missing_file_for_read_fails_without_creating_it() {
        let result = run(program(vec![
            json!({"kind":"openfile","fileIdentifier":string("missing.txt"),"mode":"READ","span":span()}),
        ]));
        assert_error(&result, "File missing.txt does not exist");
        assert!(result.virtual_files.is_empty());
    }

    // RT-11
    #[test]
    fn random_uses_the_request_seed() {
        let random_output = |seed: Option<u64>| {
            run_input(RunInput {
                ast_json: program(vec![output(vec![
                    call("RANDOM", vec![]),
                    string(" "),
                    call("RANDOM", vec![]),
                ])]),
                stdin_lines: Vec::new(),
                virtual_files: HashMap::new(),
                instruction_budget: None,
                seed,
            })
            .stdout
        };
        assert_eq!(random_output(None), random_output(None));
        assert_eq!(random_output(Some(7)), random_output(Some(7)));
        assert_ne!(random_output(Some(7)), random_output(Some(8)));
        assert_ne!(random_output(Some(7)), random_output(None));

        let request =
            r#"{"ast_json":"{\"body\":[]}","stdin_lines":[],"virtual_files":{},"seed":42}"#;
        assert!(run_pseudocode(request).contains("\"success\":true"));
    }

    #[test]
    fn string_functions_accept_char_values() {
        let char_literal = json!({"kind":"literal","value":"W","literalType":"CHAR","span":span()});
        let result = run_output(vec![
            call("LCASE", vec![char_literal.clone()]),
            call("UCASE", vec![string("w")]),
            call("LENGTH", vec![char_literal]),
        ]);
        assert!(result.success, "{}", result.stderr);
        assert_eq!(result.stdout, "wW1");
    }

    #[test]
    fn whole_real_assigned_to_integer_is_stored_as_integer() {
        let ast = program(vec![
            declare("N", "INTEGER"),
            assign("N", call("ROUND", vec![real(3.7), int(0)])),
            output(vec![ident("N")]),
        ]);
        let mut runtime = Runtime::new(RunInput {
            ast_json: ast,
            stdin_lines: Vec::new(),
            virtual_files: HashMap::new(),
            instruction_budget: None,
            seed: None,
        })
        .unwrap();
        runtime.execute_main().unwrap();
        assert_eq!(runtime.lookup("N"), Some(Value::Integer(4)));
        assert_eq!(runtime.stdout, vec!["4".to_string()]);
    }
}
