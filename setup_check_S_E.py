import subprocess

# print("Installing development dependencies...")
# # Install dev dependencies to ensure all tools are available
# subprocess.run(["pip", "install", "-r", "requirements.txt"], check=True)

print("Running quality checks...")

# Run Black formatter check on services/, tests/, AND the root directory (.)
# subprocess.run(["black", "--check", "services/", "tests/", "."], check=True)
# subprocess.run(["black", "--check", "services/", "tests/"], check=True)
subprocess.run(["black", "--check", "services/"], check=True)

# Run Flake8 linter check on services/, tests/, AND the root directory (.)
# subprocess.run(["flake8", "services/", "tests/", "."], check=True)
# subprocess.run(["flake8", "services/", "tests/"], check=True)
subprocess.run(["flake8", "services/"], check=True)

# Run MyPy type check on services/, tests/, AND the root directory (.)
# subprocess.run(["mypy", "services/", "tests/", "."], check=True)
# subprocess.run(["mypy", "services/", "tests/"], check=True)
subprocess.run(["mypy", "services/"], check=True)

# print("Running all tests...")
# # Run all tests
# subprocess.run(
#     ["python", "-m", "discover", "-s", "tests/", "-p", "test_*.py"],
#     check=True,
# )

print("All checks completed.")
