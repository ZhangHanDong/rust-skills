#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EffectiveConfig {
    pub verbose: bool,
    pub output: String,
    pub retries: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FileConfig<'a> {
    pub verbose: Option<bool>,
    pub output: Option<&'a str>,
    pub retries: Option<u8>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct EnvConfig<'a> {
    pub verbose: Option<bool>,
    pub output: Option<&'a str>,
    pub retries: Option<u8>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CliArgs<'a> {
    pub verbose: Option<bool>,
    pub output: Option<&'a str>,
    pub retries: Option<u8>,
}

pub fn resolve_config(
    file: FileConfig<'_>,
    env: EnvConfig<'_>,
    cli: CliArgs<'_>,
) -> Result<EffectiveConfig, String> {
    let _ = (file, env, cli);
    Ok(EffectiveConfig {
        verbose: false,
        output: "target/report.json".to_string(),
        retries: 1,
    })
}

#[cfg(test)]
mod tests {
    use super::{resolve_config, CliArgs, EffectiveConfig, EnvConfig, FileConfig};

    const EMPTY_FILE: FileConfig<'_> = FileConfig {
        verbose: None,
        output: None,
        retries: None,
    };
    const EMPTY_ENV: EnvConfig<'_> = EnvConfig {
        verbose: None,
        output: None,
        retries: None,
    };
    const EMPTY_CLI: CliArgs<'_> = CliArgs {
        verbose: None,
        output: None,
        retries: None,
    };

    #[test]
    fn uses_defaults_when_no_source_sets_values() {
        assert_eq!(
            resolve_config(EMPTY_FILE, EMPTY_ENV, EMPTY_CLI),
            Ok(EffectiveConfig {
                verbose: false,
                output: "target/report.json".to_string(),
                retries: 1,
            })
        );
    }

    #[test]
    fn command_line_overrides_environment_and_file() {
        let file = FileConfig {
            verbose: Some(false),
            output: Some("file.json"),
            retries: Some(2),
        };
        let env = EnvConfig {
            verbose: Some(false),
            output: Some("env.json"),
            retries: Some(3),
        };
        let cli = CliArgs {
            verbose: Some(true),
            output: Some("cli.json"),
            retries: Some(4),
        };

        assert_eq!(
            resolve_config(file, env, cli),
            Ok(EffectiveConfig {
                verbose: true,
                output: "cli.json".to_string(),
                retries: 4,
            })
        );
    }

    #[test]
    fn environment_overrides_file_when_cli_is_absent() {
        let file = FileConfig {
            verbose: Some(false),
            output: Some("file.json"),
            retries: Some(2),
        };
        let env = EnvConfig {
            verbose: Some(true),
            output: Some("env.json"),
            retries: Some(3),
        };

        assert_eq!(
            resolve_config(file, env, EMPTY_CLI),
            Ok(EffectiveConfig {
                verbose: true,
                output: "env.json".to_string(),
                retries: 3,
            })
        );
    }

    #[test]
    fn rejects_empty_output_and_large_retry_counts() {
        assert!(resolve_config(
            EMPTY_FILE,
            EMPTY_ENV,
            CliArgs {
                verbose: None,
                output: Some(""),
                retries: None,
            },
        )
        .is_err());

        assert!(resolve_config(
            EMPTY_FILE,
            EMPTY_ENV,
            CliArgs {
                verbose: None,
                output: None,
                retries: Some(11),
            },
        )
        .is_err());
    }
}
