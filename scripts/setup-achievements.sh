#!/bin/bash
# Achievement System Quick Setup Script
# Usage: ./setup-achievements.sh [rust-skills-dir]

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════╗"
echo "║   🏆 Achievement System Setup             ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Determine rust-skills directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUST_SKILLS_DIR="${1:-$(dirname "$SCRIPT_DIR")}"

# Verify source exists
if [ ! -f "$RUST_SKILLS_DIR/scripts/achievement-tracker.sh" ]; then
  echo -e "${RED}Error: Cannot find achievement-tracker.sh${NC}"
  echo "Expected at: $RUST_SKILLS_DIR/scripts/achievement-tracker.sh"
  echo ""
  echo "Usage: $0 [path-to-rust-skills]"
  exit 1
fi

echo -e "${YELLOW}Step 1: Creating directories...${NC}"
mkdir -p ~/.claude/hooks
mkdir -p ~/.claude/achievements
echo -e "${GREEN}  ✓ Created ~/.claude/hooks${NC}"
echo -e "${GREEN}  ✓ Created ~/.claude/achievements${NC}"

echo ""
echo -e "${YELLOW}Step 2: Installing achievement tracker...${NC}"
cp "$RUST_SKILLS_DIR/scripts/achievement-tracker.sh" ~/.claude/hooks/
chmod +x ~/.claude/hooks/achievement-tracker.sh
echo -e "${GREEN}  ✓ Installed achievement-tracker.sh${NC}"

echo ""
echo -e "${YELLOW}Step 3: Initializing data files...${NC}"

# Initialize stats file
if [ ! -f ~/.claude/achievements/stats.json ]; then
  cat > ~/.claude/achievements/stats.json << 'EOF'
{
  "bugs_fixed": 0,
  "tests_written": 0,
  "unsafe_avoided_days": 0,
  "unsafe_used": 0,
  "code_reviews": 0,
  "docs_written": 0,
  "errors_resolved": 0,
  "refactors": 0,
  "streak_days": 0,
  "total_sessions": 0,
  "rust_questions": 0,
  "skills_used": 0,
  "last_date": "",
  "last_unsafe_date": "",
  "first_session_date": ""
}
EOF
  echo -e "${GREEN}  ✓ Created stats.json${NC}"
else
  echo -e "${BLUE}  ℹ stats.json already exists (keeping existing data)${NC}"
fi

# Initialize achievements file
if [ ! -f ~/.claude/achievements/unlocked.json ]; then
  echo '{"unlocked":[]}' > ~/.claude/achievements/unlocked.json
  echo -e "${GREEN}  ✓ Created unlocked.json${NC}"
else
  echo -e "${BLUE}  ℹ unlocked.json already exists (keeping existing data)${NC}"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Installation Complete!               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"

echo ""
echo -e "${YELLOW}Next Step: Configure Claude Code Hooks${NC}"
echo ""
echo "Add this to your ~/.claude/settings.json:"
echo ""
echo -e "${BLUE}{"
echo '  "hooks": {'
echo '    "PostToolUse": ['
echo '      {'
echo '        "matcher": "Edit|Write|Bash",'
echo '        "hooks": ['
echo '          {'
echo '            "type": "command",'
echo '            "command": "~/.claude/hooks/achievement-tracker.sh PostToolUse"'
echo '          }'
echo '        ]'
echo '      }'
echo '    ],'
echo '    "UserPromptSubmit": ['
echo '      {'
echo '        "hooks": ['
echo '          {'
echo '            "type": "command",'
echo '            "command": "~/.claude/hooks/achievement-tracker.sh UserPromptSubmit"'
echo '          }'
echo '        ]'
echo '      }'
echo '    ]'
echo '  }'
echo -e "}${NC}"

echo ""
echo -e "${YELLOW}Quick Test:${NC}"
echo "  ~/.claude/hooks/achievement-tracker.sh UserPromptSubmit"
echo ""
echo -e "${YELLOW}View Achievements:${NC}"
echo "  /achievement"
echo ""
echo -e "🎮 ${GREEN}Start coding to earn achievements!${NC}"
