use std::collections::HashMap;

pub fn first_unique(input: &[String]) -> Option<&str> {
    let _counts: HashMap<&str, usize> = HashMap::new();
    let _ = input;
    None
}

#[cfg(test)]
mod tests {
    use super::first_unique;

    #[test]
    fn returns_first_unique_borrowed_value() {
        let items = vec![
            "red".to_string(),
            "blue".to_string(),
            "red".to_string(),
            "green".to_string(),
        ];

        assert_eq!(first_unique(&items), Some("blue"));
    }

    #[test]
    fn returns_none_when_everything_repeats() {
        let items = vec!["a".to_string(), "b".to_string(), "a".to_string(), "b".to_string()];
        assert_eq!(first_unique(&items), None);
    }
}
