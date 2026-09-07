#!/usr/bin/env bash
# Rust Skills Setup Script

echo "Setting up Rust Skills for Claude Code..."

# Create permissions file if it doesn't exist
if [ ! -f ".claude/settings.local.json" ]; then
    mkdir -p .claude
    cat > .claude/settings.local.json << 'EOF'
{
  "permissions": {
    "allow": [
      "Bash(agent-browser *)"
    ]
  }
}
EOF
    echo "Created .claude/settings.local.json with agent-browser permissions"
else
    echo ".claude/settings.local.json already exists, please add permissions manually:"
    echo '  "Bash(agent-browser *)"'
fi

echo "Setup complete!"
echo ""
echo "Usage:"
echo "  claude --plugin-dir $(dirname "$0")"
