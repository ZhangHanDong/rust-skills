#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CommandStatus {
    Ok,
    Failed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CommandReport<'a> {
    pub command: &'a str,
    pub status: CommandStatus,
    pub exit_code: i32,
    pub message: &'a str,
    pub elapsed_ms: u64,
}

pub fn render_json(report: &CommandReport<'_>) -> String {
    let _ = report;
    "{}".to_string()
}

#[cfg(test)]
mod tests {
    use super::{render_json, CommandReport, CommandStatus};

    #[test]
    fn renders_stable_compact_success_json() {
        let report = CommandReport {
            command: "build",
            status: CommandStatus::Ok,
            exit_code: 0,
            message: "done",
            elapsed_ms: 42,
        };

        assert_eq!(
            render_json(&report),
            r#"{"schemaVersion":1,"command":"build","status":"ok","exitCode":0,"message":"done","elapsedMs":42}"#
        );
    }

    #[test]
    fn renders_failure_status_and_exit_code() {
        let report = CommandReport {
            command: "deploy",
            status: CommandStatus::Failed,
            exit_code: 1,
            message: "config missing",
            elapsed_ms: 7,
        };

        assert_eq!(
            render_json(&report),
            r#"{"schemaVersion":1,"command":"deploy","status":"failed","exitCode":1,"message":"config missing","elapsedMs":7}"#
        );
    }

    #[test]
    fn escapes_json_strings_without_dependencies() {
        let report = CommandReport {
            command: "show",
            status: CommandStatus::Failed,
            exit_code: 2,
            message: "bad \"path\"\nnext\\line",
            elapsed_ms: 1,
        };
        let rendered = render_json(&report);

        assert!(rendered.contains(r#""message":"bad \"path\"\nnext\\line""#));
        assert!(!rendered.contains('\n'));
    }
}
