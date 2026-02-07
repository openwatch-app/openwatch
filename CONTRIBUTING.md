# Contributing to OpenWatch

Thank you for your interest in contributing to OpenWatch! We welcome feedback, bug reports, and code contributions to help make this project better.

## How to Contribute

### 🐛 Reporting Bugs

If you find a bug, please create a GitHub Issue with the following details:

- **Description**: A clear and concise description of the bug.
- **Steps to Reproduce**: Detailed steps to reproduce the behavior.
- **Expected Behavior**: What you expected to happen.
- **Screenshots**: If applicable, add screenshots to help explain your problem.

### 💡 Feature Requests

We welcome new ideas! Please open an issue to discuss your feature request before working on it. This ensures that your idea fits the project's goals and prevents wasted effort.

### 💻 Code Contributions

1. **Fork the Repository**: Create a fork of the project.
2. **Create a Branch**: Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. **Commit Changes**: Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. **Push to Branch**: Push to the branch (`git push origin feature/AmazingFeature`).
5. **Open a Pull Request**: Submit a Pull Request for review.

**Note**: By submitting a Pull Request, you agree to allow the project maintainers to license your work under the project's existing license.

## Project Setup

Please refer to the [Development Setup](README.md#development-setup) section in the `README.md` file for instructions on how to set up the project locally.

## Development Guidelines

To maintain code quality and consistency, please adhere to the following guidelines:

### File Naming

- Use **kebab-case** for all files (e.g., `submit-button.tsx`, `user-profile.ts`).
- React components should match the file name.

### Coding Style

- **Arrow Functions**: Use arrow functions for all components and functions.

    ```tsx
    // ✅ Correct
    const MyComponent = () => { ... }

    // ❌ Avoid
    function MyComponent() { ... }
    ```

- **Exports**: Use `export default` for main component exports.
- **Clean Code**: Write concise, readable, and maintainable code with meaningful variable names.

### UI/UX & Styling

- **Tailwind CSS**: Use utility classes for styling.
- **Design Accuracy**: If implementing a design, aim for pixel-perfect precision.

### Database

- If you modify the schema, ensure you run `npm run db:generate` to create migrations.

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## License

By contributing to OpenWatch, you agree that your contributions will be licensed under its **MIT License**.
