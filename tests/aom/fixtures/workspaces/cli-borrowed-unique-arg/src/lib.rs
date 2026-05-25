use std::collections::HashMap;

pub fn first_unique_arg(args: &[String]) -> Option<&str> {
    let _counts: HashMap<&str, usize> = HashMap::new();
    let _ = args;
    None
}

#[cfg(test)]
mod tests {
    use super::first_unique_arg;

    #[test]
    fn returns_first_unique_borrowed_argument() {
        let args = vec![
            "--input".to_string(),
            "data.csv".to_string(),
            "--input".to_string(),
            "--format".to_string(),
        ];

        assert_eq!(first_unique_arg(&args), Some("data.csv"));
    }

    #[test]
    fn returns_none_when_every_argument_repeats() {
        let args = vec![
            "--verbose".to_string(),
            "--dry-run".to_string(),
            "--verbose".to_string(),
            "--dry-run".to_string(),
        ];

        assert_eq!(first_unique_arg(&args), None);
    }

    #[test]
    fn returned_str_is_borrowed_from_input() {
        let args = vec!["build".to_string(), "test".to_string(), "build".to_string()];
        let value = first_unique_arg(&args).expect("unique arg");

        assert_eq!(value, args[1].as_str());
    }
}
