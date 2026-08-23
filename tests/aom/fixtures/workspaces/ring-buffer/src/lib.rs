#![no_std]

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RingError {
    Full,
}

pub struct RingBuffer<const N: usize> {
    buf: [u8; N],
    head: usize,
    tail: usize,
    len: usize,
}

impl<const N: usize> RingBuffer<N> {
    pub const fn new() -> Self {
        Self {
            buf: [0; N],
            head: 0,
            tail: 0,
            len: 0,
        }
    }

    pub const fn len(&self) -> usize {
        self.len
    }

    pub const fn is_empty(&self) -> bool {
        self.len == 0
    }

    pub const fn is_full(&self) -> bool {
        self.len == N
    }

    pub fn push(&mut self, _value: u8) -> Result<(), RingError> {
        Err(RingError::Full)
    }

    pub fn pop(&mut self) -> Option<u8> {
        None
    }
}

impl<const N: usize> Default for RingBuffer<N> {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::{RingBuffer, RingError};

    #[test]
    fn preserves_fifo_order_across_wraparound() {
        let mut buffer = RingBuffer::<3>::new();
        buffer.push(1).unwrap();
        buffer.push(2).unwrap();
        buffer.push(3).unwrap();
        assert_eq!(buffer.pop(), Some(1));
        buffer.push(4).unwrap();

        assert_eq!(buffer.pop(), Some(2));
        assert_eq!(buffer.pop(), Some(3));
        assert_eq!(buffer.pop(), Some(4));
        assert_eq!(buffer.pop(), None);
    }

    #[test]
    fn rejects_push_when_full() {
        let mut buffer = RingBuffer::<1>::new();
        assert_eq!(buffer.push(7), Ok(()));
        assert_eq!(buffer.push(8), Err(RingError::Full));
        assert!(buffer.is_full());
        assert_eq!(buffer.len(), 1);
    }
}
