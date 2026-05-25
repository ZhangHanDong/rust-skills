#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CliError {
    Usage(String),
    Io(String),
    Config(String),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ExitReport {
    pub code: i32,
    pub stderr: String,
}

pub fn exit_report(result: Result<&str, CliError>) -> ExitReport {
    let _ = result;
    ExitReport {
        code: 0,
        stderr: String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::{exit_report, CliError, ExitReport};

    #[test]
    fn success_has_zero_exit_and_empty_stderr() {
        assert_eq!(
            exit_report(Ok("created")),
            ExitReport {
                code: 0,
                stderr: String::new(),
            }
        );
    }

    #[test]
    fn usage_error_exits_two_with_usage_context() {
        let report = exit_report(Err(CliError::Usage("--output requires a value".to_string())));

        assert_eq!(report.code, 2);
        assert!(report.stderr.contains("usage"));
        assert!(report.stderr.contains("--output requires a value"));
    }

    #[test]
    fn runtime_errors_exit_one_with_actionable_context() {
        let io = exit_report(Err(CliError::Io("permission denied".to_string())));
        assert_eq!(io.code, 1);
        assert!(io.stderr.contains("I/O error"));
        assert!(io.stderr.contains("permission denied"));
        assert!(!io.stderr.to_lowercase().contains("warning"));

        let config = exit_report(Err(CliError::Config("missing profile".to_string())));
        assert_eq!(config.code, 1);
        assert!(config.stderr.contains("configuration error"));
        assert!(config.stderr.contains("missing profile"));
    }
}
