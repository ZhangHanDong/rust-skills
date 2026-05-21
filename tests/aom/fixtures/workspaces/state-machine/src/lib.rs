#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OrderState {
    Draft,
    Submitted,
    Paid,
    Shipped,
    Cancelled,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Event {
    Submit,
    Pay,
    Ship,
    Cancel,
}

pub fn transition(_state: OrderState, _event: Event) -> Result<OrderState, &'static str> {
    Err("invalid transition")
}

#[cfg(test)]
mod tests {
    use super::{transition, Event, OrderState};

    #[test]
    fn accepts_valid_happy_path() {
        assert_eq!(transition(OrderState::Draft, Event::Submit), Ok(OrderState::Submitted));
        assert_eq!(transition(OrderState::Submitted, Event::Pay), Ok(OrderState::Paid));
        assert_eq!(transition(OrderState::Paid, Event::Ship), Ok(OrderState::Shipped));
    }

    #[test]
    fn supports_cancellation_before_shipping() {
        assert_eq!(transition(OrderState::Draft, Event::Cancel), Ok(OrderState::Cancelled));
        assert_eq!(transition(OrderState::Submitted, Event::Cancel), Ok(OrderState::Cancelled));
        assert_eq!(transition(OrderState::Paid, Event::Cancel), Ok(OrderState::Cancelled));
    }

    #[test]
    fn keeps_terminal_states_terminal() {
        assert!(transition(OrderState::Shipped, Event::Cancel).is_err());
        assert!(transition(OrderState::Cancelled, Event::Submit).is_err());
    }
}
