import subprocess
import sys
from pathlib import Path
from typing import List

# =========================
# Configuration
# =========================

# setup_check.py - Configuration Changes

# =========================
# Configuration
# =========================

# Folders to check
DIRS = ["services", "tests"]
# Include all root-level .py files
DIRS += [str(p) for p in Path(".").glob("*.py")]

# Patterns to exclude from Black/Ruff/MyPy
EXCLUDE = ["venv", ".venv", "__init__.py"]

# List of test scripts to exclude from the automatic run
# These tests typically require the server to be running (E2E/API tests)
TEST_EXCLUDE_LIST = ["test_main_api.py", "test_rate_limit.py"]

# Regex for Black / MyPy
BLACK_MYPY_EXCLUDE = r"(^|/|\\)(" + "|".join(EXCLUDE) + r")($|/|\\)"

# Comma-separated exclude string for Ruff
RUFF_EXCLUDE = ",".join(EXCLUDE)

# Regex for Black / MyPy
BLACK_MYPY_EXCLUDE = r"(^|/|\\)(" + "|".join(EXCLUDE) + r")($|/|\\)"

# Comma-separated exclude string for Ruff
RUFF_EXCLUDE = ",".join(EXCLUDE)


# =========================
# Helper function
# =========================
def run_tool(name: str, args: List[str], check: bool = True) -> None:
    """Run a tool via subprocess and print status."""
    try:
        subprocess.run(args, check=check)
        print(f"{name}: no issues found.")
    except subprocess.CalledProcessError:
        print(f"{name}: issues found!")


def install_dependencies(requirements_file: str = "requirements.txt") -> None:
    """Install dependencies silently unless an error occurs."""
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", requirements_file],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )
    except subprocess.CalledProcessError as e:
        print("Error installing dependencies:")
        print(e.stderr.decode())
        raise


def run_scripts_in_folder(folder: str, exclude_list: List[str]) -> None:
    """
    Run all Python scripts in a folder individually, excluding a specified list.

    Args:
        folder: The directory path to search for scripts.
        exclude_list: List of filenames to skip.
    """
    scripts_path = Path(folder)

    # Iterate over all .py files in the specified folder
    for script in scripts_path.glob("*.py"):
        # 💡 FEATURE: Check if the current script should be skipped
        if script.name in exclude_list:
            print(f"Skipping API/E2E test: {script.name}")
            continue  # Skip to the next file

        print(f"Running infrastructure check: {script.name}...")

        # Use subprocess to run the test script
        # The check=True ensures the script will stop if the test fails
        # (raises an exception)
        try:
            subprocess.run([sys.executable, "-m", f"tests.{script.stem}"], check=True)
        except subprocess.CalledProcessError as e:
            # Provide a clearer message if an infrastructure test fails
            print(f"ERROR: Infrastructure check {script.name} failed! See error above.")
            # Re-raise the exception to stop the overall setup check
            raise e


# =========================
# Main execution
# =========================
if __name__ == "__main__":
    print("Installing development dependencies...")
    install_dependencies()

    print("Running quality checks...")

    # Black (formatting)
    run_tool(
        "Black",
        ["black", "--check", *DIRS, "--exclude", BLACK_MYPY_EXCLUDE],
    )

    # Ruff (linting + auto-fix)
    run_tool(
        "Ruff",
        ["ruff", "check", *DIRS, "--fix", "--exclude", RUFF_EXCLUDE],
    )

    # MyPy (type checking)
    run_tool(
        "MyPy",
        ["mypy", *DIRS, "--exclude", BLACK_MYPY_EXCLUDE],
        check=False,  # MyPy may exit non-zero without stopping the script
    )

    # Run all Python scripts in tests/ (excluding API/E2E tests)
    print("\nRunning infrastructure and service checks...")
    # Pass the exclusion list to the function
    run_scripts_in_folder("tests", TEST_EXCLUDE_LIST)

    print("All checks completed.")
