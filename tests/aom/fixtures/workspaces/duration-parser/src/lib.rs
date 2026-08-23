#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ParseDurationError {
    Empty,
    InvalidNumber,
    InvalidUnit,
}

pub fn parse_duration_seconds(input: &str) -> Result<u64, ParseDurationError> {
    let _ = input;
    Err(ParseDurationError::Empty)
}

#[cfg(test)]
mod tests {
    use super::{parse_duration_seconds, ParseDurationError};

    #[test]
    fn parses_compound_duration() {
        assert_eq!(parse_duration_seconds("1h30m15s"), Ok(5_415));
    }

    #[test]
    fn parses_single_units() {
        assert_eq!(parse_duration_seconds("2h"), Ok(7_200));
        assert_eq!(parse_duration_seconds("45m"), Ok(2_700));
        assert_eq!(parse_duration_seconds("9s"), Ok(9));
    }

    #[test]
    fn rejects_malformed_input() {
        assert_eq!(parse_duration_seconds(""), Err(ParseDurationError::Empty));
        assert_eq!(parse_duration_seconds("h"), Err(ParseDurationError::InvalidNumber));
        assert_eq!(parse_duration_seconds("10x"), Err(ParseDurationError::InvalidUnit));
    }
}
