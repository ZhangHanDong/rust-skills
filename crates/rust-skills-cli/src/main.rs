use regex::{Regex, RegexBuilder};
use serde::Deserialize;
use serde_json::{Map, Value, json};
use std::cmp::Ordering;
use std::collections::{HashMap, HashSet};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Deserialize)]
struct Registry {
    #[serde(default)]
    rust_signals: Signals,
    #[serde(default)]
    skills: Vec<Skill>,
    #[serde(default)]
    routes: Vec<Route>,
}

#[derive(Debug, Default, Deserialize)]
struct Signals {
    #[serde(default)]
    keywords: Vec<String>,
    #[serde(default)]
    regexes: Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
struct Skill {
    id: String,
    path: String,
    #[serde(default)]
    layer: Option<String>,
    #[serde(flatten)]
    extra: Map<String, Value>,
}

#[derive(Debug, Deserialize)]
struct Route {
    id: String,
    skill: String,
    #[serde(default)]
    layer: Option<String>,
    #[serde(default)]
    category: Option<String>,
    #[serde(default)]
    priority: Option<i64>,
    #[serde(default)]
    requires_rust_signal: bool,
    #[serde(default)]
    keywords: Vec<String>,
    #[serde(default)]
    regexes: Vec<String>,
}

#[derive(Clone, Debug)]
struct RouteMatch {
    route: String,
    skill: String,
    layer: Option<String>,
    category: Option<String>,
    priority: i64,
    matched_kind: String,
    matched_value: String,
}

struct Runtime {
    root: PathBuf,
    registry: Registry,
    skills_by_id: HashMap<String, Skill>,
}

fn main() {
    let argv = env::args().skip(1).collect::<Vec<_>>();
    let exit_code = match run(&argv) {
        Ok(code) => code,
        Err(error) => {
            eprintln!("{error}");
            1
        }
    };
    std::process::exit(exit_code);
}

fn run(argv: &[String]) -> Result<i32, String> {
    let Some(command) = argv.first().map(String::as_str) else {
        print_help();
        return Ok(0);
    };
    let command_args = &argv[1..];
    let json_output = has_flag(command_args, "--json");

    match command {
        "help" | "--help" | "-h" => {
            print_help();
            Ok(0)
        }
        "detect" => {
            if wants_help(command_args) {
                print_detect_help();
                return Ok(0);
            }
            let route = route_prompt(&prompt_from(command_args))?;
            let value = json!({
                "decision": route["decision"].clone(),
                "should_inject": route["should_inject"].clone(),
                "prompt_is_rust": route["prompt_is_rust"].clone(),
                "rust_signal": route["rust_signal"].clone(),
                "skills": route["skills"].clone(),
                "runtime_root": route["runtime_root"].clone()
            });
            write_output(
                &value,
                value["decision"].as_str().unwrap_or("no-op"),
                json_output,
            );
            Ok(0)
        }
        "route" => {
            if wants_help(command_args) {
                print_route_help();
                return Ok(0);
            }
            let value = route_prompt(&prompt_from(command_args))?;
            let text = value["skills"]
                .as_array()
                .map(|skills| {
                    skills
                        .iter()
                        .filter_map(Value::as_str)
                        .collect::<Vec<_>>()
                        .join("\n")
                })
                .unwrap_or_default();
            write_output(&value, &text, json_output);
            Ok(0)
        }
        "index" => run_index(command_args, json_output),
        "verify" => {
            if wants_help(command_args) {
                print_verify_help();
                return Ok(0);
            }
            let value = verify_registry()?;
            let status = value["status"].as_str().unwrap_or("FAIL");
            write_output(&value, status, json_output);
            Ok(i32::from(status != "PASS"))
        }
        _ => {
            eprintln!("Unknown command: {command}\n");
            print_help();
            Ok(2)
        }
    }
}

fn run_index(args: &[String], json_output: bool) -> Result<i32, String> {
    let Some(subcommand) = args.first().map(String::as_str) else {
        print_index_help();
        return Ok(0);
    };

    match subcommand {
        "help" | "--help" | "-h" => {
            print_index_help();
            Ok(0)
        }
        "list" => {
            if wants_help(&args[1..]) {
                print_index_list_help();
                return Ok(0);
            }
            let value = list_skills()?;
            let text = value["skills"]
                .as_array()
                .map(|skills| {
                    skills
                        .iter()
                        .filter_map(|skill| skill.get("id").and_then(Value::as_str))
                        .collect::<Vec<_>>()
                        .join("\n")
                })
                .unwrap_or_default();
            write_output(&value, &text, json_output);
            Ok(0)
        }
        "query" => {
            if wants_help(&args[1..]) {
                print_index_query_help();
                return Ok(0);
            }
            let stripped = strip_flags(&args[1..]);
            let Some(skill_id) = stripped.first() else {
                eprintln!("Missing skill id");
                return Ok(2);
            };
            let value = query_skill(skill_id)?;
            let found = value["found"].as_bool().unwrap_or(false);
            let text = if found {
                value["path"].as_str().unwrap_or("not found")
            } else {
                "not found"
            };
            write_output(&value, text, json_output);
            Ok(i32::from(!found))
        }
        _ => {
            eprintln!("Unknown command: index\n");
            print_index_help();
            Ok(2)
        }
    }
}

fn print_help() {
    println!(
        "Rust Skills native runtime\n\nUsage:\n  rust-skills detect [--json] <prompt>\n  rust-skills route [--json] <prompt>\n  rust-skills index list [--json]\n  rust-skills index query <skill-id> [--json]\n  rust-skills verify [--json]\n\nCommands:\n  detect   Cheap Rust prompt detection summary.\n  route    Matched skill route and runtime skill paths.\n  index    Registry listing and skill lookup.\n  verify   Runtime registry and skill-standard checks.\n\nEnvironment:\n  RUST_SKILLS_ROOT  Override runtime data root."
    );
}

fn print_detect_help() {
    println!(
        "Detect whether a prompt should receive Rust Skills context.\n\nUsage:\n  rust-skills detect [--json] <prompt>\n\nOutput:\n  Text mode prints inject or no-op.\n  JSON mode includes decision, should_inject, rust_signal, skills, and runtime_root."
    );
}

fn print_route_help() {
    println!(
        "Route a Rust prompt to matched skills.\n\nUsage:\n  rust-skills route [--json] <prompt>\n\nOutput:\n  Text mode prints matched skill IDs, one per line.\n  JSON mode includes layers, match reasons, skill paths, context cost, and runtime_root."
    );
}

fn print_index_help() {
    println!(
        "Inspect the installed Rust Skills registry.\n\nUsage:\n  rust-skills index list [--json]\n  rust-skills index query <skill-id> [--json]\n\nSubcommands:\n  list    List every registered skill.\n  query   Look up one skill path and metadata."
    );
}

fn print_index_list_help() {
    println!(
        "List registered Rust Skills.\n\nUsage:\n  rust-skills index list [--json]\n\nText mode prints skill IDs. JSON mode includes registered skill metadata."
    );
}

fn print_index_query_help() {
    println!(
        "Look up one Rust Skill by ID.\n\nUsage:\n  rust-skills index query <skill-id> [--json]\n\nExample:\n  rust-skills index query rust-router --json"
    );
}

fn print_verify_help() {
    println!(
        "Verify the installed Rust Skills runtime.\n\nUsage:\n  rust-skills verify [--json]\n\nChecks include route registry integrity, skill file presence, and router visibility gates."
    );
}

fn has_flag(args: &[String], flag: &str) -> bool {
    args.iter().any(|arg| arg == flag)
}

fn wants_help(args: &[String]) -> bool {
    has_flag(args, "--help") || has_flag(args, "-h")
}

fn strip_flags(args: &[String]) -> Vec<String> {
    args.iter()
        .filter(|arg| !arg.starts_with("--"))
        .cloned()
        .collect()
}

fn prompt_from(args: &[String]) -> String {
    strip_flags(args).join(" ").trim().to_string()
}

fn write_output(value: &Value, text: &str, json_output: bool) {
    if json_output {
        println!(
            "{}",
            serde_json::to_string_pretty(value).expect("json serialization should work")
        );
    } else {
        println!("{text}");
    }
}

fn route_prompt(prompt: &str) -> Result<Value, String> {
    let runtime = load_runtime()?;
    let rust_signal = has_rust_signal(prompt, &runtime.registry);
    let mut matches = Vec::new();

    for route in &runtime.registry.routes {
        if route.requires_rust_signal && !rust_signal {
            continue;
        }
        if let Some((kind, value)) = match_route(prompt, route) {
            matches.push(RouteMatch {
                route: route.id.clone(),
                skill: route.skill.clone(),
                layer: route.layer.clone(),
                category: route.category.clone(),
                priority: route.priority.unwrap_or(0),
                matched_kind: kind,
                matched_value: value,
            });
        }
    }

    if rust_signal && !matches.iter().any(|item| item.skill == "rust-router") {
        matches.push(RouteMatch {
            route: "rust-signal".to_string(),
            skill: "rust-router".to_string(),
            layer: Some("router".to_string()),
            category: Some("rust".to_string()),
            priority: 1000,
            matched_kind: "signal".to_string(),
            matched_value: "rust".to_string(),
        });
    }

    matches.sort_by(compare_route_matches);
    let skills = unique_skills(&matches);
    let should_inject = !skills.is_empty();
    let layers = build_layers(skills.clone(), &runtime.skills_by_id);
    let paths = build_paths(&skills, &runtime.skills_by_id);

    Ok(json!({
        "decision": if should_inject { "inject" } else { "no-op" },
        "should_inject": should_inject,
        "prompt_is_rust": should_inject,
        "rust_signal": rust_signal,
        "skills": skills,
        "layers": layers,
        "matches": matches_to_value(&matches),
        "paths": paths,
        "context_cost": paths.len(),
        "runtime_root": runtime.root.to_string_lossy()
    }))
}

fn compare_route_matches(left: &RouteMatch, right: &RouteMatch) -> Ordering {
    if left.skill == "rust-router" {
        return Ordering::Less;
    }
    if right.skill == "rust-router" {
        return Ordering::Greater;
    }
    right
        .priority
        .cmp(&left.priority)
        .then_with(|| left.skill.cmp(&right.skill))
}

fn unique_skills(matches: &[RouteMatch]) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut skills = Vec::new();
    for item in matches {
        if seen.insert(item.skill.clone()) {
            skills.push(item.skill.clone());
        }
    }
    skills
}

fn build_paths(skills: &[String], skills_by_id: &HashMap<String, Skill>) -> Map<String, Value> {
    let mut paths = Map::new();
    for skill_id in skills {
        let value = skills_by_id
            .get(skill_id)
            .map_or(Value::Null, |skill| Value::String(skill.path.clone()));
        paths.insert(skill_id.clone(), value);
    }
    paths
}

fn build_layers(skills: Vec<String>, skills_by_id: &HashMap<String, Skill>) -> Value {
    let mut layers = Map::new();
    for layer in [
        "router",
        "layer1",
        "layer2",
        "layer3",
        "utility",
        "experimental",
    ] {
        layers.insert(layer.to_string(), Value::Array(Vec::new()));
    }

    for skill_id in skills {
        let layer = skills_by_id
            .get(&skill_id)
            .and_then(|skill| skill.layer.as_deref())
            .unwrap_or("utility");
        if !layers.contains_key(layer) {
            layers.insert(layer.to_string(), Value::Array(Vec::new()));
        }
        if let Some(Value::Array(items)) = layers.get_mut(layer) {
            items.push(Value::String(skill_id));
        }
    }
    Value::Object(layers)
}

fn matches_to_value(matches: &[RouteMatch]) -> Value {
    Value::Array(
        matches
            .iter()
            .map(|item| {
                json!({
                    "route": item.route,
                    "skill": item.skill,
                    "layer": item.layer,
                    "category": item.category,
                    "priority": item.priority,
                    "matched": {
                        "kind": item.matched_kind,
                        "value": item.matched_value
                    }
                })
            })
            .collect(),
    )
}

fn list_skills() -> Result<Value, String> {
    let runtime = load_runtime()?;
    Ok(json!({
        "runtime_root": runtime.root.to_string_lossy(),
        "skills": runtime.registry.skills.iter().map(skill_to_value).collect::<Vec<_>>()
    }))
}

fn query_skill(skill_id: &str) -> Result<Value, String> {
    let runtime = load_runtime()?;
    let Some(skill) = runtime.skills_by_id.get(skill_id) else {
        return Ok(json!({
            "found": false,
            "id": skill_id,
            "runtime_root": runtime.root.to_string_lossy()
        }));
    };

    let absolute_path = runtime.root.join(&skill.path);
    let mut object = Map::new();
    object.insert("found".to_string(), Value::Bool(true));
    extend_skill_value(&mut object, skill);
    object.insert(
        "absolute_path".to_string(),
        Value::String(absolute_path.to_string_lossy().to_string()),
    );
    object.insert(
        "exists".to_string(),
        Value::Bool(file_exists(&absolute_path)),
    );
    object.insert(
        "runtime_root".to_string(),
        Value::String(runtime.root.to_string_lossy().to_string()),
    );
    Ok(Value::Object(object))
}

fn skill_to_value(skill: &Skill) -> Value {
    let mut object = Map::new();
    extend_skill_value(&mut object, skill);
    Value::Object(object)
}

fn extend_skill_value(object: &mut Map<String, Value>, skill: &Skill) {
    object.insert("id".to_string(), Value::String(skill.id.clone()));
    object.insert("path".to_string(), Value::String(skill.path.clone()));
    if let Some(layer) = &skill.layer {
        object.insert("layer".to_string(), Value::String(layer.clone()));
    }
    for (key, value) in &skill.extra {
        object.insert(key.clone(), value.clone());
    }
}

fn verify_registry() -> Result<Value, String> {
    let runtime = load_runtime()?;
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    for skill in &runtime.registry.skills {
        if !file_exists(&runtime.root.join(&skill.path)) {
            errors.push(format!("missing skill file: {}", skill.path));
        }
    }

    for route in &runtime.registry.routes {
        if !runtime.skills_by_id.contains_key(&route.skill) {
            errors.push(format!(
                "route {} references unknown skill {}",
                route.id, route.skill
            ));
        }
    }

    let router_result = verify_rust_router_skill(&runtime.root);
    errors.extend(router_result.errors);
    warnings.extend(router_result.warnings);

    for relative in [
        ".codex/hooks/rust-skill-router-hook.js",
        ".claude/hooks/rust-skill-eval-hook.js",
        "hooks/hooks.json",
    ] {
        let file_path = runtime.root.join(relative);
        if file_exists(&file_path) {
            let content = fs::read_to_string(&file_path)
                .map_err(|error| format!("cannot read {}: {error}", file_path.display()))?;
            if content.contains("codex_hooks") {
                errors.push(format!("deprecated codex_hooks appears in {relative}"));
            }
        }
    }

    Ok(json!({
        "status": if errors.is_empty() { "PASS" } else { "FAIL" },
        "runtime_root": runtime.root.to_string_lossy(),
        "skill_count": runtime.registry.skills.len(),
        "route_count": runtime.registry.routes.len(),
        "errors": errors,
        "warnings": warnings
    }))
}

struct VerifySkillResult {
    errors: Vec<String>,
    warnings: Vec<String>,
}

fn verify_rust_router_skill(root: &Path) -> VerifySkillResult {
    let mut errors = Vec::new();
    let warnings = Vec::new();
    let relative_path = Path::new("skills").join("rust-router").join("SKILL.md");
    let skill_path = root.join(&relative_path);
    let relative = relative_path.to_string_lossy();

    if !file_exists(&skill_path) {
        errors.push(format!("missing rust-router skill file: {relative}"));
        return VerifySkillResult { errors, warnings };
    }

    let Ok(content) = fs::read_to_string(&skill_path) else {
        errors.push(format!("cannot read rust-router skill file: {relative}"));
        return VerifySkillResult { errors, warnings };
    };
    let Some((metadata, body)) = parse_skill_frontmatter(&content) else {
        errors.push(format!(
            "rust-router skill is missing YAML frontmatter: {relative}"
        ));
        return VerifySkillResult { errors, warnings };
    };

    let description = metadata.get("description").map_or("", String::as_str);
    let first_window = first_chars(&content, 2500);
    let body_lines = body.lines().count();

    if metadata.get("name").map(String::as_str) != Some("rust-router") {
        errors.push(format!(
            "rust-router frontmatter name must be rust-router: {relative}"
        ));
    }
    if description.chars().count() > 1024 {
        errors.push(format!(
            "rust-router description exceeds 1024 characters: {}",
            description.chars().count()
        ));
    }
    if !description.contains("Use when:") || !description.contains("Keywords:") {
        errors.push("rust-router description must include Use when: and Keywords:".to_string());
    }
    if body_lines > 500 {
        errors.push(format!("rust-router body exceeds 500 lines: {body_lines}"));
    }
    if !content.is_ascii() {
        errors.push("rust-router skill must stay plain English/ASCII".to_string());
    }

    for anchor in [
        "## Routing Calibration",
        "Concept Anchors",
        "public API contract",
        "length, alignment",
        "criterion",
        "exit code",
        "object safe",
        "no_std",
        "embedded",
        "deadlock risk",
    ] {
        if !first_window.contains(anchor) {
            errors.push(format!(
                "rust-router first 2500 chars must expose anchor: {anchor}"
            ));
        }
    }

    for forbidden in ["INSTRUCTIONS FOR CLAUDE", "INSTRUCTIONS FOR CODEX"] {
        if body.contains(forbidden) {
            errors.push(format!(
                "rust-router body contains platform-specific heading: {forbidden}"
            ));
        }
    }

    VerifySkillResult { errors, warnings }
}

fn parse_skill_frontmatter(content: &str) -> Option<(HashMap<String, String>, &str)> {
    if !content.starts_with("---\n") {
        return None;
    }
    let end = content[4..].find("\n---")? + 4;
    let block = content[4..end].trim();
    let body_start = end + "\n---".len();
    let mut metadata = HashMap::new();

    for line in block.lines() {
        let Some((key, raw_value)) = line.split_once(':') else {
            continue;
        };
        let value = raw_value
            .trim()
            .trim_matches('"')
            .trim_matches('\'')
            .to_string();
        metadata.insert(key.trim().to_string(), value);
    }

    Some((metadata, &content[body_start..]))
}

fn first_chars(value: &str, count: usize) -> String {
    value.chars().take(count).collect()
}

fn match_route(text: &str, route: &Route) -> Option<(String, String)> {
    for keyword in &route.keywords {
        if keyword_matches(text, keyword) {
            return Some(("keyword".to_string(), keyword.clone()));
        }
    }
    for regex in &route.regexes {
        if regex_matches(text, regex) {
            return Some(("regex".to_string(), regex.clone()));
        }
    }
    None
}

fn has_rust_signal(text: &str, registry: &Registry) -> bool {
    registry
        .rust_signals
        .keywords
        .iter()
        .any(|keyword| keyword_matches(text, keyword))
        || registry
            .rust_signals
            .regexes
            .iter()
            .any(|regex| regex_matches(text, regex))
}

fn keyword_matches(text: &str, keyword: &str) -> bool {
    let rust_case_sensitive_tokens = [
        "Rc", "Arc", "Box", "RefCell", "Cell", "Mutex", "RwLock", "Send", "Sync", "Drop",
    ];

    if rust_case_sensitive_tokens.contains(&keyword) {
        return bounded_regex(keyword, false).is_some_and(|regex| regex.is_match(text));
    }

    if is_word_like(keyword) && keyword.len() <= 12 {
        return bounded_regex(keyword, true).is_some_and(|regex| regex.is_match(text));
    }

    text.to_lowercase().contains(&keyword.to_lowercase())
}

fn bounded_regex(keyword: &str, case_insensitive: bool) -> Option<Regex> {
    let pattern = format!(
        r"(^|[^A-Za-z0-9_]){}([^A-Za-z0-9_]|$)",
        regex::escape(keyword)
    );
    RegexBuilder::new(&pattern)
        .case_insensitive(case_insensitive)
        .build()
        .ok()
}

fn is_word_like(value: &str) -> bool {
    value
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '_' | '+' | ':' | '-'))
}

fn regex_matches(text: &str, regex_source: &str) -> bool {
    RegexBuilder::new(regex_source)
        .case_insensitive(true)
        .build()
        .is_ok_and(|regex| regex.is_match(text))
}

fn load_runtime() -> Result<Runtime, String> {
    let root = find_runtime_root();
    let routes_path = root.join("index").join("routes.json");
    if !file_exists(&routes_path) {
        return Err(format!(
            "routes registry not found: {}",
            routes_path.display()
        ));
    }
    let content = fs::read_to_string(&routes_path)
        .map_err(|error| format!("cannot read {}: {error}", routes_path.display()))?;
    let registry: Registry = serde_json::from_str(&content)
        .map_err(|error| format!("cannot parse {}: {error}", routes_path.display()))?;
    let skills_by_id = registry
        .skills
        .iter()
        .cloned()
        .map(|skill| (skill.id.clone(), skill))
        .collect();

    Ok(Runtime {
        root,
        registry,
        skills_by_id,
    })
}

fn find_runtime_root() -> PathBuf {
    for candidate in runtime_root_candidates() {
        if file_exists(&candidate.join("index").join("routes.json")) {
            return candidate;
        }
    }
    current_dir()
}

fn runtime_root_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Ok(root) = env::var("RUST_SKILLS_ROOT") {
        candidates.push(PathBuf::from(root));
    }

    if let Ok(exe) = env::current_exe() {
        if let Some(bin_dir) = exe.parent() {
            candidates.push(bin_dir.join("..").join("rust-skills"));
            candidates.push(bin_dir.join(".."));
        }
    }

    candidates.push(current_dir());

    for home in home_candidates() {
        candidates.push(home.join(".codex").join("rust-skills"));
        candidates.push(home.join(".claude").join("rust-skills"));
        candidates.push(home.join(".local").join("share").join("rust-skills"));
    }

    unique_paths(candidates)
}

fn home_candidates() -> Vec<PathBuf> {
    let mut homes = Vec::new();
    for key in ["HOME", "USERPROFILE"] {
        if let Ok(value) = env::var(key) {
            homes.push(PathBuf::from(value));
        }
    }
    unique_paths(homes)
}

fn current_dir() -> PathBuf {
    env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

fn unique_paths(paths: Vec<PathBuf>) -> Vec<PathBuf> {
    let mut seen = HashSet::new();
    let mut output = Vec::new();
    for path in paths {
        let normalized = normalize_path(&path);
        if seen.insert(normalized.clone()) {
            output.push(normalized);
        }
    }
    output
}

fn normalize_path(path: &Path) -> PathBuf {
    let absolute = if path.is_absolute() {
        path.to_path_buf()
    } else {
        current_dir().join(path)
    };
    fs::canonicalize(&absolute).unwrap_or(absolute)
}

fn file_exists(path: &Path) -> bool {
    path.is_file()
}

#[cfg(test)]
mod tests {
    use super::{is_word_like, keyword_matches};

    #[test]
    fn bounded_keywords_do_not_match_inside_words() {
        assert!(keyword_matches("Rust Rc cannot be sent", "Rc"));
        assert!(!keyword_matches("Rocket Mortgage", "Rc"));
        assert!(keyword_matches("cargo build failed", "cargo"));
        assert!(keyword_matches("cargo shipping", "cargo"));
    }

    #[test]
    fn word_like_matches_js_shape() {
        assert!(!is_word_like("Cargo.toml"));
        assert!(is_word_like("Send"));
        assert!(is_word_like("no_std"));
    }
}
