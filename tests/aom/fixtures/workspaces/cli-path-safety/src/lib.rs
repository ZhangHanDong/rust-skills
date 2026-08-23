use std::path::{Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PathError {
    Empty,
    OutsideRoot,
    RootDeletion,
}

pub fn plan_delete(root: &Path, requested: &Path) -> Result<PathBuf, PathError> {
    let _ = (root, requested);
    Err(PathError::OutsideRoot)
}

#[cfg(test)]
mod tests {
    use std::path::{Path, PathBuf};

    use super::{plan_delete, PathError};

    #[test]
    fn accepts_normalized_path_inside_workspace() {
        let root = Path::new("/workspace/project");
        let requested = Path::new("/workspace/project/target/tmp/../cache");

        assert_eq!(
            plan_delete(root, requested),
            Ok(PathBuf::from("/workspace/project/target/cache"))
        );
    }

    #[test]
    fn rejects_empty_and_workspace_root_deletion() {
        let root = Path::new("/workspace/project");

        assert_eq!(plan_delete(root, Path::new("")), Err(PathError::Empty));
        assert_eq!(plan_delete(root, root), Err(PathError::RootDeletion));
        assert_eq!(
            plan_delete(root, Path::new("/workspace/project/.")),
            Err(PathError::RootDeletion)
        );
    }

    #[test]
    fn rejects_paths_that_escape_workspace() {
        let root = Path::new("/workspace/project");

        assert_eq!(
            plan_delete(root, Path::new("/workspace/project/../../etc")),
            Err(PathError::OutsideRoot)
        );
        assert_eq!(
            plan_delete(root, Path::new("/workspace/project/../other")),
            Err(PathError::OutsideRoot)
        );
    }
}
