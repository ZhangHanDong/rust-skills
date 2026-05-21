#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Config {
    pub verbose: bool,
    pub output: Option<String>,
    pub inputs: Vec<String>,
}

pub fn parse_args(args: &[&str]) -> Result<Config, String> {
    Ok(Config {
        verbose: false,
        output: None,
        inputs: args.iter().map(|item| (*item).to_string()).collect(),
    })
}

#[cfg(test)]
mod tests {
    use super::{parse_args, Config};

    #[test]
    fn parses_verbose_output_and_inputs() {
        let parsed = parse_args(&["--verbose", "--output", "out.txt", "a.rs", "b.rs"]);
        assert_eq!(
            parsed,
            Ok(Config {
                verbose: true,
                output: Some("out.txt".to_string()),
                inputs: vec!["a.rs".to_string(), "b.rs".to_string()]
            })
        );
    }

    #[test]
    fn rejects_missing_output_value() {
        assert!(parse_args(&["--output"]).is_err());
    }

    #[test]
    fn rejects_unknown_flags() {
        assert!(parse_args(&["--threads", "4"]).is_err());
    }
}
